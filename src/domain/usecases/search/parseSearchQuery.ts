import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import type {TransactionType, TransactionSource} from '@domain/entities/Transaction';

// Resolving named operators like `category:food` or `wallet:"GTB Main"` to
// their ids requires the caller to hand us the current catalogue. Passing
// this as an explicit context object keeps the parser itself pure and
// trivially mockable, and avoids the parser pulling in the store/datasource.
export type ResolveCtx = {
  wallets: Array<{id: string; name: string; currency?: string}>;
  categories: Array<{id: string; name: string; type?: 'expense' | 'income' | 'both'}>;
  // Anchor for relative dates like `today` / `last-month`. Defaults to
  // Date.now() if omitted — injected in tests so the expectations stay
  // deterministic.
  now?: number;
  // Offset in minutes from UTC (matches the return shape of
  // Date.getTimezoneOffset, but inverted: positive = east of UTC). Used
  // so that `today` means "the user's local today" even when the runtime
  // is in another zone (useful for jest which uses UTC by default).
  timezoneOffsetMinutes?: number;
};

export type ParsedQuery = {
  text: string;
  negated: string[];
  phrases: string[];
  filters: Partial<TransactionFilter>;
};

// Canonical list of recognised operator prefixes. Anything else is kept
// verbatim in the free-text output so the server can still ILIKE it — we
// treat unknown operators as noise, not as errors.
const OPERATORS = new Set([
  'amount', 'category', 'wallet', 'currency', 'tag',
  'type', 'source', 'date',
]);

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

type RawToken =
  | {kind: 'text'; value: string}
  | {kind: 'phrase'; value: string}
  | {kind: 'negated'; value: string}
  | {kind: 'op'; key: string; value: string};

// Splits the raw query string into tokens while preserving quoted phrases
// and operator:value pairs (with support for quoted values).
function tokenise(raw: string): RawToken[] {
  const tokens: RawToken[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }

    // Quoted phrase (free text, no operator).
    if (ch === '"') {
      const end = raw.indexOf('"', i + 1);
      if (end === -1) { break; }
      tokens.push({kind: 'phrase', value: raw.slice(i + 1, end)});
      i = end + 1;
      continue;
    }

    // Read until next whitespace OR balanced closing quote after a colon.
    let end = i;
    while (end < raw.length && raw[end] !== ' ' && raw[end] !== '\t' && raw[end] !== '\n') {
      if (raw[end] === '"') {
        // Consume the quoted segment as part of the current token.
        const close = raw.indexOf('"', end + 1);
        if (close === -1) { end = raw.length; break; }
        end = close + 1;
      } else {
        end += 1;
      }
    }
    const word = raw.slice(i, end);
    i = end;

    if (word.length === 0) { continue; }

    // Negation.
    if (word.startsWith('-') && word.length > 1 && !word.includes(':')) {
      tokens.push({kind: 'negated', value: word.slice(1)});
      continue;
    }

    // Operator (foo:bar or foo:"bar baz").
    const colon = word.indexOf(':');
    if (colon > 0 && colon < word.length - 1) {
      const key = word.slice(0, colon).toLowerCase();
      let value = word.slice(colon + 1);
      // Strip surrounding quotes if present.
      if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        value = value.slice(1, -1);
      }
      if (OPERATORS.has(key)) {
        tokens.push({kind: 'op', key, value});
        continue;
      }
    }

    tokens.push({kind: 'text', value: word});
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

// Handles "1,234.56", "$1,234", "₦1,234", EU "1.234,56". Returns minor
// units (cents) as an integer, or null if the string is unparseable. We
// always return 2-decimal cents; multi-currency precision is resolved at
// query time.
function parseMoneyToCents(raw: string): number | null {
  let s = raw.trim().replace(/[$€£₦¥₹]/g, '');
  if (!s) { return null; }
  // If both , and . appear, assume the last one is the decimal separator
  // and the other is the thousands separator — covers both EN and EU.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // EU format: 1.234,56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only comma present — ambiguous. Treat as decimal if it's within the
    // last 3 chars (e.g. "10,50"), else as a thousands separator.
    if (s.length - lastComma <= 3) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }
  if (!/^\d+(\.\d+)?$/.test(s)) { return null; }
  const num = Number(s);
  if (!Number.isFinite(num)) { return null; }
  return Math.round(num * 100);
}

type AmountFilter = {minAmount?: number; maxAmount?: number};

function parseAmountOperator(value: string): AmountFilter | null {
  const v = value.trim();
  if (!v) { return null; }

  // Range: a..b
  const range = v.match(/^(.+?)\.\.(.+)$/);
  if (range) {
    const min = parseMoneyToCents(range[1]);
    const max = parseMoneyToCents(range[2]);
    if (min === null || max === null) { return null; }
    return {minAmount: min, maxAmount: max};
  }

  // Comparators
  if (v.startsWith('>=')) {
    const n = parseMoneyToCents(v.slice(2));
    return n === null ? null : {minAmount: n};
  }
  if (v.startsWith('<=')) {
    const n = parseMoneyToCents(v.slice(2));
    return n === null ? null : {maxAmount: n};
  }
  if (v.startsWith('>')) {
    const n = parseMoneyToCents(v.slice(1));
    // Strictly greater than -> next cent up.
    return n === null ? null : {minAmount: n + 1};
  }
  if (v.startsWith('<')) {
    const n = parseMoneyToCents(v.slice(1));
    return n === null ? null : {maxAmount: n - 1};
  }

  // Equality shorthand: amount:25 → minAmount == maxAmount == 2500.
  const n = parseMoneyToCents(v);
  if (n === null) { return null; }
  return {minAmount: n, maxAmount: n};
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

type DateRangeMs = {startMs: number; endMs: number};

function startOfDayUtc(year: number, month0: number, day: number): number {
  return Date.UTC(year, month0, day, 0, 0, 0, 0);
}
function endOfDayUtc(year: number, month0: number, day: number): number {
  return Date.UTC(year, month0, day, 23, 59, 59, 999);
}

function parseDateOperator(value: string, now: number): DateRangeMs | null {
  const v = value.trim().toLowerCase();
  if (!v) { return null; }
  const today = new Date(now);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  // Named ranges.
  switch (v) {
    case 'today':
      return {startMs: startOfDayUtc(y, m, d), endMs: endOfDayUtc(y, m, d)};
    case 'yesterday': {
      const t = new Date(Date.UTC(y, m, d - 1));
      return {
        startMs: startOfDayUtc(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()),
        endMs: endOfDayUtc(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()),
      };
    }
    case 'this-week': {
      // Sunday-start week. Good enough for rough filtering; matches the
      // conventions used elsewhere in the app.
      const dayOfWeek = today.getUTCDay();
      const start = new Date(Date.UTC(y, m, d - dayOfWeek));
      const end = new Date(Date.UTC(y, m, d - dayOfWeek + 6));
      return {
        startMs: startOfDayUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
        endMs: endOfDayUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
      };
    }
    case 'last-week': {
      const dayOfWeek = today.getUTCDay();
      const start = new Date(Date.UTC(y, m, d - dayOfWeek - 7));
      const end = new Date(Date.UTC(y, m, d - dayOfWeek - 1));
      return {
        startMs: startOfDayUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
        endMs: endOfDayUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
      };
    }
    case 'this-month': {
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return {
        startMs: startOfDayUtc(y, m, 1),
        endMs: endOfDayUtc(y, m, lastDay),
      };
    }
    case 'last-month': {
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return {
        startMs: startOfDayUtc(y, m - 1, 1),
        endMs: endOfDayUtc(y, m - 1, lastDay),
      };
    }
    case 'this-year':
      return {startMs: startOfDayUtc(y, 0, 1), endMs: endOfDayUtc(y, 11, 31)};
    case 'last-year':
      return {startMs: startOfDayUtc(y - 1, 0, 1), endMs: endOfDayUtc(y - 1, 11, 31)};
  }

  // YYYY-MM-DD
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (match) {
    const yy = Number(match[1]);
    const mm = Number(match[2]) - 1;
    const dd = Number(match[3]);
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) { return null; }
    return {startMs: startOfDayUtc(yy, mm, dd), endMs: endOfDayUtc(yy, mm, dd)};
  }

  // YYYY-MM
  match = /^(\d{4})-(\d{2})$/.exec(v);
  if (match) {
    const yy = Number(match[1]);
    const mm = Number(match[2]) - 1;
    if (!Number.isFinite(yy) || mm < 0 || mm > 11) { return null; }
    const lastDay = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    return {startMs: startOfDayUtc(yy, mm, 1), endMs: endOfDayUtc(yy, mm, lastDay)};
  }

  // YYYY
  match = /^(\d{4})$/.exec(v);
  if (match) {
    const yy = Number(match[1]);
    return {startMs: startOfDayUtc(yy, 0, 1), endMs: endOfDayUtc(yy, 11, 31)};
  }

  return null;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

function resolveCategory(value: string, ctx: ResolveCtx): string | undefined {
  const v = value.trim().toLowerCase();
  if (!v) { return undefined; }
  const hit = ctx.categories.find((c) => c.name.toLowerCase() === v || c.id === v);
  return hit?.id;
}

function resolveWallet(value: string, ctx: ResolveCtx): string | undefined {
  const v = value.trim().toLowerCase();
  if (!v) { return undefined; }
  const hit = ctx.wallets.find((w) => w.name.toLowerCase() === v || w.id === v);
  return hit?.id;
}

// ---------------------------------------------------------------------------
// Main entrypoint
// ---------------------------------------------------------------------------

const VALID_TYPES: ReadonlySet<TransactionType> = new Set<TransactionType>([
  'income', 'expense', 'transfer',
]);
const VALID_SOURCES: ReadonlySet<TransactionSource> = new Set<TransactionSource>([
  'manual', 'payoneer', 'grey', 'dukascopy',
]);

export function parseSearchQuery(raw: string, ctx: ResolveCtx): ParsedQuery {
  const out: ParsedQuery = {
    text: '', negated: [], phrases: [], filters: {},
  };
  if (!raw || raw.trim().length === 0) { return out; }

  const now = ctx.now ?? Date.now();
  const tokens = tokenise(raw);
  const textParts: string[] = [];
  const tags: string[] = [];
  const amount: AmountFilter = {};

  for (const t of tokens) {
    if (t.kind === 'text') {
      textParts.push(t.value);
      continue;
    }
    if (t.kind === 'phrase') {
      out.phrases.push(t.value);
      continue;
    }
    if (t.kind === 'negated') {
      out.negated.push(t.value);
      continue;
    }

    // Operator.
    switch (t.key) {
      case 'amount': {
        const parsed = parseAmountOperator(t.value);
        if (!parsed) {
          // Malformed -> keep as free text so the user still gets something.
          textParts.push(`amount:${t.value}`);
          break;
        }
        if (parsed.minAmount !== undefined) {
          amount.minAmount = amount.minAmount !== undefined
            ? Math.max(amount.minAmount, parsed.minAmount)
            : parsed.minAmount;
        }
        if (parsed.maxAmount !== undefined) {
          amount.maxAmount = amount.maxAmount !== undefined
            ? Math.min(amount.maxAmount, parsed.maxAmount)
            : parsed.maxAmount;
        }
        break;
      }
      case 'category': {
        const id = resolveCategory(t.value, ctx);
        if (id) { out.filters.categoryId = id; }
        else { textParts.push(`category:${t.value}`); }
        break;
      }
      case 'wallet': {
        const id = resolveWallet(t.value, ctx);
        if (id) { out.filters.walletId = id; }
        else { textParts.push(`wallet:${t.value}`); }
        break;
      }
      case 'currency': {
        const v = t.value.trim().toUpperCase();
        if (/^[A-Z]{3}$/.test(v)) { out.filters.currency = v; }
        else { textParts.push(`currency:${t.value}`); }
        break;
      }
      case 'tag': {
        const v = t.value.trim();
        if (v) { tags.push(v); }
        break;
      }
      case 'type': {
        const v = t.value.trim().toLowerCase() as TransactionType;
        if (VALID_TYPES.has(v)) { out.filters.type = v; }
        break;
      }
      case 'source': {
        const v = t.value.trim().toLowerCase() as TransactionSource;
        if (VALID_SOURCES.has(v)) { out.filters.source = v; }
        break;
      }
      case 'date': {
        const range = parseDateOperator(t.value, now);
        if (range) { out.filters.dateRange = range; }
        break;
      }
    }
  }

  if (amount.minAmount !== undefined) { out.filters.minAmount = amount.minAmount; }
  if (amount.maxAmount !== undefined) { out.filters.maxAmount = amount.maxAmount; }
  if (tags.length > 0) { out.filters.tags = tags; }

  out.text = textParts.join(' ').trim().replace(/\s+/g, ' ');
  return out;
}
