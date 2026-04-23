import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';
import type {Budget} from '@domain/entities/Budget';
import type {ParsedQuery} from '@domain/usecases/search/parseSearchQuery';
import type {
  GroupedSearchResults,
  SearchResult,
} from '@data/repositories/UniversalSearchRepository';

// Local trigram index used when the RPC is unreachable. AsyncStorage is
// our persistent layer — MMKV would be a faster choice but adds a native
// dep. Because search happens off the UI thread only if the underlying
// native bridge allows it, we keep the index small (MAX_TRANSACTIONS) and
// do the scoring synchronously in JS.
//
// Durability goal: surviving app relaunch so a user who opened Search
// without network sees their most recent transactions instead of an empty
// screen.
//
// This is a fallback, not a replacement — everything here is best-effort.

const STORAGE_KEY = 'walletpulse.search.local_index.v1';
const MAX_TRANSACTIONS = 5000;
const MIN_SCORE = 0.05;

type IndexShape = {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  budgets: Budget[];
  updatedAt: number;
};

function normalise(s: string | undefined | null): string {
  if (!s) { return ''; }
  return s
    .toLowerCase()
    // Strip diacritics — same behaviour as Postgres unaccent().
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s}  `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    out.add(padded.slice(i, i + 3));
  }
  return out;
}

// Jaccard similarity over trigrams — approximates pg_trgm's similarity().
function similarity(a: string, b: string): number {
  if (!a || !b) { return 0; }
  const sa = trigrams(a);
  const sb = trigrams(b);
  let intersection = 0;
  for (const t of sa) { if (sb.has(t)) { intersection += 1; } }
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function txSearchText(t: Transaction): string {
  return normalise(
    [
      t.merchant, t.description, t.notes, t.locationName,
      t.templateName, t.currency, (t.tags || []).join(' '),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function walletSearchText(w: Wallet): string {
  return normalise(`${w.name} ${w.currency}`);
}

function categorySearchText(c: Category): string {
  return normalise(`${c.name} ${c.icon}`);
}

function budgetSearchText(b: Budget): string {
  return normalise(`${b.currency} ${b.period}`);
}

function matchesFilters(
  parsed: ParsedQuery,
  t: Transaction,
): boolean {
  const f = parsed.filters;
  if (f.walletId && t.walletId !== f.walletId) { return false; }
  if (f.categoryId && t.categoryId !== f.categoryId) { return false; }
  if (f.type && t.type !== f.type) { return false; }
  if (f.source && t.source !== f.source) { return false; }
  if (f.currency && t.currency !== f.currency) { return false; }
  if (f.merchant && t.merchant !== f.merchant) { return false; }
  if (f.minAmount !== undefined && t.amount < f.minAmount) { return false; }
  if (f.maxAmount !== undefined && t.amount > f.maxAmount) { return false; }
  if (f.dateRange) {
    if (t.transactionDate < f.dateRange.startMs) { return false; }
    if (t.transactionDate > f.dateRange.endMs) { return false; }
  }
  if (f.tags && f.tags.length > 0) {
    const tagSet = new Set(t.tags || []);
    if (!f.tags.every((tag) => tagSet.has(tag))) { return false; }
  }
  for (const has of parsed.has) {
    if (has === 'receipt' && !t.receiptUri) { return false; }
    if (has === 'notes'   && !t.notes)      { return false; }
    if (has === 'location' && !t.locationName &&
        (t.locationLat === null || t.locationLat === undefined)) { return false; }
    if (has === 'tags'    && (!t.tags || t.tags.length === 0)) { return false; }
  }
  for (const is of parsed.is) {
    if (is === 'recurring' && !t.isRecurring) { return false; }
    if (is === 'template'  && !t.isTemplate)  { return false; }
  }
  for (const n of parsed.negated) {
    const needle = normalise(n);
    if (txSearchText(t).includes(needle)) { return false; }
  }
  return true;
}

export class LocalSearchIndex {
  private state: IndexShape = {
    transactions: [], wallets: [], categories: [], budgets: [], updatedAt: 0,
  };
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) { return; }
    this.hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as IndexShape;
        if (parsed && Array.isArray(parsed.transactions)) {
          this.state = parsed;
        }
      }
    } catch {
      // Corrupted blob — start clean, don't crash the app.
    }
  }

  async rebuild(
    transactions: Transaction[],
    wallets: Wallet[],
    categories: Category[],
    budgets: Budget[],
  ): Promise<void> {
    // LRU policy: keep the most recent transactions by transactionDate.
    const sorted = [...transactions].sort(
      (a, b) => b.transactionDate - a.transactionDate,
    );
    this.state = {
      transactions: sorted.slice(0, MAX_TRANSACTIONS),
      wallets,
      categories,
      budgets,
      updatedAt: Date.now(),
    };
    this.hydrated = true;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage full or unavailable — the in-memory copy still works for
      // this session.
    }
  }

  async clear(): Promise<void> {
    this.state = {
      transactions: [], wallets: [], categories: [], budgets: [], updatedAt: 0,
    };
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  get size(): number {
    return this.state.transactions.length;
  }

  get updatedAt(): number {
    return this.state.updatedAt;
  }

  search(parsed: ParsedQuery, limit = 50): GroupedSearchResults {
    const q = normalise(
      [parsed.text, ...parsed.phrases].filter(Boolean).join(' '),
    );
    const hasQuery = q.length > 0;

    const txScored: Array<{t: Transaction; rank: number}> = [];
    for (const t of this.state.transactions) {
      if (!matchesFilters(parsed, t)) { continue; }
      let rank = 0;
      if (hasQuery) {
        const txt = txSearchText(t);
        if (txt.includes(q)) {
          rank = 1;
        } else {
          const sim = similarity(txt, q);
          if (sim < MIN_SCORE) { continue; }
          rank = sim;
        }
      }
      txScored.push({t, rank});
    }

    if (hasQuery) {
      txScored.sort((a, b) => b.rank - a.rank || b.t.transactionDate - a.t.transactionDate);
    } else {
      txScored.sort((a, b) => b.t.transactionDate - a.t.transactionDate);
    }

    const transactions: SearchResult[] = txScored
      .slice(0, limit)
      .map(({t, rank}) => ({entity: 'transaction', id: t.id, rank, transaction: t}));

    const wallets: SearchResult[] = hasQuery
      ? this.state.wallets
          .map((w) => ({w, score: this.#peripheralScore(walletSearchText(w), q)}))
          .filter(({score}) => score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(({w, score}) => ({entity: 'wallet', id: w.id, rank: score, wallet: w}))
      : [];

    const categories: SearchResult[] = hasQuery
      ? this.state.categories
          .map((c) => ({c, score: this.#peripheralScore(categorySearchText(c), q)}))
          .filter(({score}) => score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(({c, score}) => ({entity: 'category', id: c.id, rank: score, category: c}))
      : [];

    const budgets: SearchResult[] = hasQuery
      ? this.state.budgets
          .map((b) => ({b, score: this.#peripheralScore(budgetSearchText(b), q)}))
          .filter(({score}) => score >= MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(({b, score}) => ({entity: 'budget', id: b.id, rank: score, budget: b}))
      : [];

    return {
      transactions: transactions as GroupedSearchResults['transactions'],
      wallets: wallets as GroupedSearchResults['wallets'],
      categories: categories as GroupedSearchResults['categories'],
      budgets: budgets as GroupedSearchResults['budgets'],
    };
  }

  #peripheralScore(haystack: string, needle: string): number {
    if (!haystack || !needle) { return 0; }
    if (haystack.includes(needle)) { return 1; }
    return similarity(haystack, needle);
  }
}

// Singleton — one per app, lazily hydrated.
let cachedIndex: LocalSearchIndex | null = null;
export function getLocalSearchIndex(): LocalSearchIndex {
  if (!cachedIndex) {
    cachedIndex = new LocalSearchIndex();
  }
  return cachedIndex;
}

// Test-only reset hook; safe to call in production.
export function resetLocalSearchIndexForTests(): void {
  cachedIndex = null;
}
