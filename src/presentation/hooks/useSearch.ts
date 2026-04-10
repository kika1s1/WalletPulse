/**
 * Intentionally queries WatermelonDB directly: observable-friendly queries and
 * multi-column OR search (description, merchant, notes). `makeSearchTransactions`
 * maps search to description-only via ITransactionRepository; keeping this hook
 * aligned with the use case would narrow search behavior or add extra round trips.
 */
import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import database from '@data/database';
import TransactionModel from '@data/database/models/TransactionModel';
import {Q} from '@nozbe/watermelondb';
import type {Transaction, TransactionType, TransactionSource} from '@domain/entities/Transaction';
import type {
  TransactionFilter,
  TransactionSort,
  TransactionSortField,
  SortDirection,
} from '@domain/repositories/ITransactionRepository';
import {toDomain} from '@data/mappers/transaction-mapper';

const DEBOUNCE_MS = 300;

function sortColumnForField(field: TransactionSortField): string {
  switch (field) {
    case 'transactionDate':
      return 'transaction_date';
    case 'amount':
      return 'amount';
    case 'createdAt':
      return 'created_at';
  }
}

function modelToDomain(model: TransactionModel): Transaction {
  return toDomain({
    id: model.id,
    walletId: model.walletId,
    categoryId: model.categoryId,
    amount: model.amount,
    currency: model.currency,
    type: model.type,
    description: model.description,
    merchant: model.merchant,
    source: model.source,
    sourceHash: model.sourceHash,
    tags: model.tags,
    receiptUri: model.receiptUri,
    isRecurring: model.isRecurring,
    recurrenceRule: model.recurrenceRule,
    confidence: model.confidence,
    locationLat: model.locationLat,
    locationLng: model.locationLng,
    locationName: model.locationName,
    notes: model.notes,
    isTemplate: model.isTemplate,
    templateName: model.templateName,
    transactionDate: model.transactionDate,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  });
}

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
    if (filters.type) {count++;}
    if (filters.source) {count++;}
    if (filters.categoryId) {count++;}
    if (filters.walletId) {count++;}
    if (filters.currency) {count++;}
    if (filters.minAmount !== undefined) {count++;}
    if (filters.maxAmount !== undefined) {count++;}
    if (filters.dateRange) {count++;}
    if (filters.tags && filters.tags.length > 0) {count++;}
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
        const collection = database.get<TransactionModel>('transactions');
        const conditions: any[] = [];

        if (debouncedQuery) {
          const safe = Q.sanitizeLikeString(debouncedQuery);
          conditions.push(
            Q.or(
              Q.where('description', Q.like(`%${safe}%`)),
              Q.where('merchant', Q.like(`%${safe}%`)),
              Q.where('notes', Q.like(`%${safe}%`)),
            ),
          );
        }

        if (filters.type) {
          conditions.push(Q.where('type', filters.type));
        }
        if (filters.source) {
          conditions.push(Q.where('source', filters.source));
        }
        if (filters.categoryId) {
          conditions.push(Q.where('category_id', filters.categoryId));
        }
        if (filters.walletId) {
          conditions.push(Q.where('wallet_id', filters.walletId));
        }
        if (filters.currency) {
          conditions.push(Q.where('currency', filters.currency));
        }
        if (filters.minAmount !== undefined) {
          conditions.push(Q.where('amount', Q.gte(filters.minAmount)));
        }
        if (filters.maxAmount !== undefined) {
          conditions.push(Q.where('amount', Q.lte(filters.maxAmount)));
        }
        if (filters.dateRange) {
          conditions.push(
            Q.where(
              'transaction_date',
              Q.between(filters.dateRange.startMs, filters.dateRange.endMs),
            ),
          );
        }
        if (filters.tags && filters.tags.length > 0) {
          for (const tag of filters.tags) {
            const safe = Q.sanitizeLikeString(tag);
            conditions.push(Q.where('tags', Q.like(`%${safe}%`)));
          }
        }

        const sortCol = sortColumnForField(sort.field);
        const sortDir = sort.direction === 'desc' ? Q.desc : Q.asc;

        let q;
        if (conditions.length === 0) {
          q = collection.query(Q.sortBy(sortCol, sortDir));
        } else if (conditions.length === 1) {
          q = collection.query(conditions[0], Q.sortBy(sortCol, sortDir));
        } else {
          q = collection.query(Q.and(...conditions), Q.sortBy(sortCol, sortDir));
        }

        const models = await q.fetch();
        if (currentId !== requestIdRef.current) {
          return;
        }
        setResults(models.map(modelToDomain));
      } catch {
        if (currentId === requestIdRef.current) {
          setResults([]);
        }
      } finally {
        if (currentId === requestIdRef.current) {
          setIsSearching(false);
        }
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
    query,
    setQuery,
    results,
    resultCount: results.length,
    isSearching,
    filters,
    setFilters,
    activeFilterCount,
    sort,
    setSort,
    clearAll,
    hasActiveSearch,
  };
}
