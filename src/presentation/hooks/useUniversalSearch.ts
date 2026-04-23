import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import {parseSearchQuery, type ParsedQuery, type ResolveCtx} from '@domain/usecases/search/parseSearchQuery';
import type {
  GroupedSearchResults,
  SearchCursor,
  SearchFilters,
} from '@data/repositories/UniversalSearchRepository';
import type {TransactionSortField, SortDirection} from '@domain/repositories/ITransactionRepository';
import {getLocalSearchIndex} from '@infrastructure/search/LocalSearchIndex';
import {emitSearchEvent} from '@shared/analytics/searchEvents';

const DEBOUNCE_MS = 250;
const MIN_TEXT_LENGTH = 2;
const PAGE_SIZE = 50;

export type SearchStatus =
  | 'idle'
  | 'searching'
  | 'ok'
  | 'empty'
  | 'offline'
  | 'error';

export type UniversalSortOption = {
  field: TransactionSortField | 'relevance';
  direction: SortDirection;
  label: string;
};

export const UNIVERSAL_SORT_OPTIONS: UniversalSortOption[] = [
  {field: 'relevance', direction: 'desc', label: 'Best match'},
  {field: 'transactionDate', direction: 'desc', label: 'Newest first'},
  {field: 'transactionDate', direction: 'asc', label: 'Oldest first'},
  {field: 'amount', direction: 'desc', label: 'Highest amount'},
  {field: 'amount', direction: 'asc', label: 'Lowest amount'},
  {field: 'createdAt', direction: 'desc', label: 'Recently added'},
];

const EMPTY_RESULTS: GroupedSearchResults = {
  transactions: [], wallets: [], categories: [], budgets: [],
};

function isNetworkLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) { return false; }
  const m = err.message.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('timeout') ||
    m.includes('aborted') ||
    m.includes('econnrefused') ||
    m.includes('enotfound')
  );
}

export type UseUniversalSearchOptions = {
  ctx: ResolveCtx;
};

export type UseUniversalSearchReturn = {
  raw: string;
  setRaw: (s: string) => void;
  parsed: ParsedQuery;
  status: SearchStatus;
  results: GroupedSearchResults;
  totalCount: number;
  hasActiveSearch: boolean;
  usingOfflineIndex: boolean;
  sort: UniversalSortOption;
  setSort: (s: UniversalSortOption) => void;
  loadMore: () => void;
  clearAll: () => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  overrideFilters: SearchFilters;
};

function applyLocalSort(
  results: GroupedSearchResults,
  sort: UniversalSortOption,
): GroupedSearchResults {
  if (sort.field === 'relevance') { return results; }
  const factor = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...results.transactions].sort((a, b) => {
    const av = sort.field === 'amount'
      ? a.transaction.amount
      : sort.field === 'transactionDate'
        ? a.transaction.transactionDate
        : a.transaction.createdAt;
    const bv = sort.field === 'amount'
      ? b.transaction.amount
      : sort.field === 'transactionDate'
        ? b.transaction.transactionDate
        : b.transaction.createdAt;
    return (av - bv) * factor;
  });
  return {...results, transactions: sorted};
}

export function useUniversalSearch(options: UseUniversalSearchOptions): UseUniversalSearchReturn {
  const {ctx} = options;
  const [raw, setRaw] = useState('');
  const [debouncedRaw, setDebouncedRaw] = useState('');
  const [results, setResults] = useState<GroupedSearchResults>(EMPTY_RESULTS);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [usingOfflineIndex, setUsingOfflineIndex] = useState(false);
  const [sort, setSort] = useState<UniversalSortOption>(UNIVERSAL_SORT_OPTIONS[0]);
  const [overrideFilters, setOverrideFiltersState] = useState<SearchFilters>({});
  const [nextCursor, setNextCursor] = useState<SearchCursor | null>(null);
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce text input — chip/filter changes go through setOverrideFilters
  // which bypasses this and triggers immediately via a separate effect.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedRaw(raw.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [raw]);

  const parsed = useMemo<ParsedQuery>(
    () => parseSearchQuery(debouncedRaw, ctx),
    [debouncedRaw, ctx],
  );

  const effectiveFilters = useMemo<SearchFilters>(() => {
    const pf = parsed.filters;
    return {
      walletId:   overrideFilters.walletId   ?? pf.walletId,
      categoryId: overrideFilters.categoryId ?? pf.categoryId,
      type:       overrideFilters.type       ?? pf.type,
      source:     overrideFilters.source     ?? pf.source,
      currency:   overrideFilters.currency   ?? pf.currency,
      merchant:   overrideFilters.merchant   ?? pf.merchant,
      startMs:    overrideFilters.startMs    ?? pf.dateRange?.startMs,
      endMs:      overrideFilters.endMs      ?? pf.dateRange?.endMs,
      minAmount:  overrideFilters.minAmount  ?? pf.minAmount,
      maxAmount:  overrideFilters.maxAmount  ?? pf.maxAmount,
      tags:       overrideFilters.tags       ?? pf.tags,
    } as SearchFilters;
  }, [parsed, overrideFilters]);

  const hasActiveSearch = useMemo(() => {
    if (parsed.text.length > 0 || parsed.phrases.length > 0) { return true; }
    const f = effectiveFilters;
    return Boolean(
      f.walletId || f.categoryId || f.type || f.source || f.currency ||
      f.merchant || f.startMs || f.endMs ||
      f.minAmount !== undefined || f.maxAmount !== undefined ||
      (f.tags && f.tags.length > 0),
    );
  }, [parsed, effectiveFilters]);

  const runSearch = useCallback(async (cursor: SearchCursor | null) => {
    // Abort any in-flight request — important so a fast typist doesn't
    // fire-and-forget a stale request that later clobbers the state.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const seq = ++requestSeq.current;

    if (!hasActiveSearch) {
      setResults(EMPTY_RESULTS);
      setStatus('idle');
      setNextCursor(null);
      setUsingOfflineIndex(false);
      return;
    }

    // Minimum text length guard — except when the user has only operators
    // or chip filters (then text is empty but filters are non-empty).
    if (parsed.text.length > 0 && parsed.text.length < MIN_TEXT_LENGTH) {
      return;
    }

    setStatus('searching');

    const queryForRpc = [parsed.text, ...parsed.phrases.map((p) => `"${p}"`)]
      .filter(Boolean)
      .join(' ');

    emitSearchEvent('search_submitted', {
      textLength: parsed.text.length,
      hasFilters: Object.keys(effectiveFilters).length > 0,
    });

    try {
      if (!isDataSourceReady()) {
        throw new Error('Data source not ready');
      }
      const ds = getSupabaseDataSource();
      const grouped = await ds.search.search({
        query: queryForRpc,
        filters: effectiveFilters,
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) { return; }

      const merged = cursor && results
        ? {
            ...grouped,
            transactions: [...results.transactions, ...grouped.transactions],
          }
        : grouped;

      const sorted = applyLocalSort(merged, sort);
      setResults(sorted);
      setUsingOfflineIndex(false);

      // Build next cursor from the last transaction row.
      const last = sorted.transactions[sorted.transactions.length - 1];
      setNextCursor(
        last && sorted.transactions.length >= PAGE_SIZE
          ? {afterDate: last.transaction.transactionDate, afterId: last.transaction.id}
          : null,
      );

      const total = sorted.transactions.length + sorted.wallets.length +
        sorted.categories.length + sorted.budgets.length;
      if (total === 0) {
        setStatus('empty');
        emitSearchEvent('search_zero_results', {query: queryForRpc});
      } else {
        setStatus('ok');
      }
    } catch (err) {
      if (seq !== requestSeq.current) { return; }
      if (isNetworkLikeError(err)) {
        // Offline fallback — hydrate and query the local index.
        try {
          const idx = getLocalSearchIndex();
          await idx.hydrate();
          const local = idx.search(parsed, PAGE_SIZE);
          const sorted = applyLocalSort(local, sort);
          setResults(sorted);
          setUsingOfflineIndex(true);
          setNextCursor(null);
          const total = sorted.transactions.length + sorted.wallets.length +
            sorted.categories.length + sorted.budgets.length;
          setStatus(total === 0 ? 'offline' : 'ok');
          emitSearchEvent('search_offline_used', {resultCount: total});
          return;
        } catch {
          /* fall through to generic error */
        }
      }
      setResults(EMPTY_RESULTS);
      setStatus('error');
    }
  }, [hasActiveSearch, parsed, effectiveFilters, sort, results]);

  // Fire a fresh search whenever the parsed query or filter overrides
  // change. Cursor is reset so we always start at page 1.
  useEffect(() => {
    void runSearch(null);
    // Intentionally leaving `runSearch` out — runSearch depends on
    // `results` for pagination merging, but we only want to restart when
    // the query itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, effectiveFilters, sort]);

  const loadMore = useCallback(() => {
    if (!nextCursor || status === 'searching') { return; }
    void runSearch(nextCursor);
  }, [nextCursor, status, runSearch]);

  const clearAll = useCallback(() => {
    setRaw('');
    setOverrideFiltersState({});
    setSort(UNIVERSAL_SORT_OPTIONS[0]);
  }, []);

  const setFilters = useCallback((f: Partial<SearchFilters>) => {
    setOverrideFiltersState((prev) => ({...prev, ...f}));
  }, []);

  const totalCount =
    results.transactions.length + results.wallets.length +
    results.categories.length + results.budgets.length;

  return {
    raw, setRaw,
    parsed,
    status,
    results,
    totalCount,
    hasActiveSearch,
    usingOfflineIndex,
    sort, setSort,
    loadMore,
    clearAll,
    setFilters,
    overrideFilters,
  };
}
