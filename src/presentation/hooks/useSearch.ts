/**
 * @deprecated Prefer `useUniversalSearch` from
 * `@presentation/hooks/useUniversalSearch`. This hook predates the universal
 * search overhaul (2026-04) and only drives simple `.or(ilike)` queries
 * against transactions. It is kept for one release cycle so that any still-
 * live callers (currently only the `SearchFilters` type re-export used by
 * `FilterSheet`) can migrate gradually. Delete this file once that cycle has
 * shipped — see the `cleanup` todo in the universal-search-overhaul plan.
 */
import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import type {Transaction, TransactionType, TransactionSource} from '@domain/entities/Transaction';
import type {
  TransactionFilter,
  TransactionSortField,
  SortDirection,
} from '@domain/repositories/ITransactionRepository';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

const DEBOUNCE_MS = 300;

export type SearchFilters = {
  type?: TransactionType;
  source?: TransactionSource;
  categoryId?: string;
  walletId?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  dateRange?: {startMs: number; endMs: number};
  tags?: string[];
};

export type SortOption = {
  field: TransactionSortField;
  direction: SortDirection;
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  {field: 'transactionDate', direction: 'desc', label: 'Newest first'},
  {field: 'transactionDate', direction: 'asc', label: 'Oldest first'},
  {field: 'amount', direction: 'desc', label: 'Highest amount'},
  {field: 'amount', direction: 'asc', label: 'Lowest amount'},
  {field: 'createdAt', direction: 'desc', label: 'Recently added'},
];

export type UseSearchReturn = {
  query: string;
  setQuery: (q: string) => void;
  results: Transaction[];
  resultCount: number;
  isSearching: boolean;
  filters: SearchFilters;
  setFilters: (f: SearchFilters) => void;
  activeFilterCount: number;
  sort: SortOption;
  setSort: (s: SortOption) => void;
  clearAll: () => void;
  hasActiveSearch: boolean;
};

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Transaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) { count++; }
    if (filters.source) { count++; }
    if (filters.categoryId) { count++; }
    if (filters.walletId) { count++; }
    if (filters.currency) { count++; }
    if (filters.minAmount !== undefined) { count++; }
    if (filters.maxAmount !== undefined) { count++; }
    if (filters.dateRange) { count++; }
    if (filters.tags && filters.tags.length > 0) { count++; }
    return count;
  }, [filters]);

  const hasActiveSearch = debouncedQuery.length > 0 || activeFilterCount > 0;

  useEffect(() => {
    if (!hasActiveSearch) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const currentId = ++requestIdRef.current;
    setIsSearching(true);

    const run = async () => {
      try {
        const ds = getSupabaseDataSource();
        const filter: TransactionFilter = {};

        if (debouncedQuery) { filter.searchQuery = debouncedQuery; }
        if (filters.type) { filter.type = filters.type; }
        if (filters.source) { filter.source = filters.source; }
        if (filters.categoryId) { filter.categoryId = filters.categoryId; }
        if (filters.walletId) { filter.walletId = filters.walletId; }
        if (filters.currency) { filter.currency = filters.currency; }
        if (filters.minAmount !== undefined) { filter.minAmount = filters.minAmount; }
        if (filters.maxAmount !== undefined) { filter.maxAmount = filters.maxAmount; }
        if (filters.dateRange) { filter.dateRange = filters.dateRange; }
        if (filters.tags && filters.tags.length > 0) { filter.tags = filters.tags; }

        const data = await ds.transactions.findAll(filter, {
          field: sort.field,
          direction: sort.direction,
        });

        if (currentId !== requestIdRef.current) { return; }
        setResults(data);
      } catch {
        if (currentId === requestIdRef.current) { setResults([]); }
      } finally {
        if (currentId === requestIdRef.current) { setIsSearching(false); }
      }
    };

    run();
  }, [debouncedQuery, filters, sort, hasActiveSearch]);

  const clearAll = useCallback(() => {
    setQuery('');
    setFilters({});
    setSort(SORT_OPTIONS[0]);
  }, []);

  return {
    query, setQuery, results, resultCount: results.length,
    isSearching, filters, setFilters, activeFilterCount,
    sort, setSort, clearAll, hasActiveSearch,
  };
}
