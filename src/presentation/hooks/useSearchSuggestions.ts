import {useEffect, useMemo, useRef, useState} from 'react';
import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';

export type SuggestionKind = 'merchant' | 'tag' | 'category' | 'wallet' | 'operator';

export type SearchSuggestion = {
  id: string;
  kind: SuggestionKind;
  label: string;
  // The token to insert into the search input when the suggestion is
  // chosen. e.g. `category:food` for a category suggestion, or just the
  // merchant name for a merchant suggestion.
  token: string;
  // Optional pre-rendered hint (e.g. "Category · 12 transactions").
  hint?: string;
  // For `wallet` and `category` suggestions, the underlying entity id.
  // Used by the screen to navigate directly to the entity rather than
  // forcing a free-text search through the typed name.
  entityId?: string;
};

export type SuggestionSources = {
  wallets?: Pick<Wallet, 'id' | 'name' | 'currency'>[];
  categories?: Pick<Category, 'id' | 'name' | 'type'>[];
};

type Cached = {
  merchants: string[];
  tags: string[];
};

const MAX_RESULTS = 8;

function distinctSorted(values: Array<string | null | undefined>): string[] {
  const out = new Set<string>();
  for (const v of values) {
    if (v && typeof v === 'string' && v.trim()) { out.add(v.trim()); }
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function matchScore(haystack: string, needle: string): number {
  const hay = haystack.toLowerCase();
  const ned = needle.toLowerCase();
  if (ned.length === 0) { return 0; }
  if (hay === ned) { return 3; }
  if (hay.startsWith(ned)) { return 2; }
  if (hay.includes(ned)) { return 1; }
  return 0;
}

// Static list of recognised operators — lets a user who types e.g.
// `cat` discover `category:` without reading the docs.
const OPERATOR_HINTS: Array<{token: string; label: string; hint: string}> = [
  {token: 'amount:',   label: 'amount:',   hint: 'Filter by amount (amount:>50, amount:10..50)'},
  {token: 'category:', label: 'category:', hint: 'Filter by category (category:food)'},
  {token: 'wallet:',   label: 'wallet:',   hint: 'Filter by wallet (wallet:"GTB Main")'},
  {token: 'currency:', label: 'currency:', hint: 'Filter by currency (currency:USD)'},
  {token: 'tag:',      label: 'tag:',      hint: 'Filter by tag (tag:work)'},
  {token: 'type:',     label: 'type:',     hint: 'Filter by type (type:expense)'},
  {token: 'source:',   label: 'source:',   hint: 'Filter by source (source:payoneer)'},
  {token: 'date:',     label: 'date:',     hint: 'Filter by date (date:last-month)'},
];

export function useSearchSuggestions(
  rawQuery: string,
  sources: SuggestionSources = {},
): SearchSuggestion[] {
  const [cache, setCache] = useState<Cached>({merchants: [], tags: []});
  const loadedRef = useRef(false);
  const {wallets, categories} = sources;

  useEffect(() => {
    if (loadedRef.current) { return; }
    loadedRef.current = true;
    let cancelled = false;

    (async () => {
      if (!isDataSourceReady()) { return; }
      try {
        const ds = getSupabaseDataSource();
        // Pull a modestly sized window of recent transactions and pluck
        // distinct merchants/tags client-side. Querying explicit
        // distinct endpoints would be cleaner but requires a new RPC —
        // keep this simple until the suggestion UX justifies it.
        const recent = await ds.transactions.findAll(
          {limit: 500},
          {field: 'transactionDate', direction: 'desc'},
        );
        if (cancelled) { return; }
        const merchants = distinctSorted(recent.map((t) => t.merchant));
        const tags = distinctSorted(recent.flatMap((t) => t.tags || []));
        setCache({merchants, tags});
      } catch {
        // Non-fatal: suggestions are a nice-to-have.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return useMemo(() => {
    const q = rawQuery.trim();
    if (!q) { return []; }

    // If the user is typing an operator prefix (e.g. "cat"), propose
    // completions first.
    const lastToken = q.split(/\s+/).pop() ?? '';
    const results: Array<{s: SearchSuggestion; score: number}> = [];

    if (!lastToken.includes(':')) {
      for (const op of OPERATOR_HINTS) {
        const score = matchScore(op.token, lastToken);
        if (score > 0) {
          results.push({
            s: {
              id: `op-${op.token}`,
              kind: 'operator',
              label: op.label,
              token: op.token,
              hint: op.hint,
            },
            score,
          });
        }
      }
    }

    // Wallets and categories are highest-signal entity matches when the
    // user is searching for something they created — surface them ahead
    // of merchants and tags. We bump their score so an exact wallet
    // name beats a partial merchant overlap.
    if (wallets) {
      for (const w of wallets) {
        const score = matchScore(w.name, lastToken);
        if (score > 0) {
          results.push({
            s: {
              id: `wallet-${w.id}`,
              kind: 'wallet',
              label: w.name,
              token: w.name,
              hint: `Wallet · ${w.currency}`,
              entityId: w.id,
            },
            score: score + 1,
          });
        }
      }
    }

    if (categories) {
      for (const c of categories) {
        const score = matchScore(c.name, lastToken);
        if (score > 0) {
          results.push({
            s: {
              id: `category-${c.id}`,
              kind: 'category',
              label: c.name,
              token: c.name,
              hint: `Category · ${c.type}`,
              entityId: c.id,
            },
            score: score + 1,
          });
        }
      }
    }

    for (const m of cache.merchants) {
      const score = matchScore(m, lastToken);
      if (score > 0) {
        results.push({
          s: {
            id: `merchant-${m}`,
            kind: 'merchant',
            label: m,
            token: m,
            hint: 'Merchant',
          },
          score,
        });
      }
    }

    for (const t of cache.tags) {
      const score = matchScore(t, lastToken);
      if (score > 0) {
        results.push({
          s: {
            id: `tag-${t}`,
            kind: 'tag',
            label: t,
            token: `tag:${t}`,
            hint: 'Tag',
          },
          score,
        });
      }
    }

    results.sort((a, b) => b.score - a.score || a.s.label.localeCompare(b.s.label));
    return results.slice(0, MAX_RESULTS).map((r) => r.s);
  }, [rawQuery, cache, wallets, categories]);
}
