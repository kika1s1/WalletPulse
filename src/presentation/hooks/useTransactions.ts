import {useState, useEffect, useCallback, useMemo} from 'react';
import type {Transaction} from '@domain/entities/Transaction';
import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {useFilterStore, type TransactionTypeFilter} from '@presentation/stores/useFilterStore';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

export type UseTransactionsReturn = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export type UseTransactionsOptions = {
  filter?: TransactionFilter;
  syncWithFilterStore?: boolean;
};

function mergeFiltersFromStore(
  typeFilter: TransactionTypeFilter,
  searchQuery: string,
  selectedWalletId: string | null,
  selectedCategoryId: string | null,
  dateRange: {startMs: number; endMs: number} | null,
  explicit?: TransactionFilter,
): TransactionFilter {
  const base: TransactionFilter = {};
  if (typeFilter !== 'all') { base.type = typeFilter; }
  if (searchQuery.trim() !== '') { base.searchQuery = searchQuery.trim(); }
  if (selectedWalletId) { base.walletId = selectedWalletId; }
  if (selectedCategoryId) { base.categoryId = selectedCategoryId; }
  if (dateRange) { base.dateRange = dateRange; }
  return explicit !== undefined ? {...base, ...explicit} : base;
}

export function useTransactions(
  options?: UseTransactionsOptions,
): UseTransactionsReturn {
  const syncWithFilterStore = options?.syncWithFilterStore ?? true;
  const explicitFilter = options?.filter;

  const typeFilter = useFilterStore((s) => s.typeFilter);
  const searchQuery = useFilterStore((s) => s.searchQuery);
  const selectedWalletId = useFilterStore((s) => s.selectedWalletId);
  const selectedCategoryId = useFilterStore((s) => s.selectedCategoryId);
  const dateRange = useFilterStore((s) => s.dateRange);

  const mergedFilter = useMemo((): TransactionFilter | undefined => {
    if (!syncWithFilterStore && explicitFilter === undefined) { return undefined; }
    if (!syncWithFilterStore) { return explicitFilter; }
    const merged = mergeFiltersFromStore(
      typeFilter, searchQuery, selectedWalletId,
      selectedCategoryId, dateRange, explicitFilter,
    );
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [syncWithFilterStore, explicitFilter, typeFilter, searchQuery, selectedWalletId, selectedCategoryId, dateRange]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const data = await ds.transactions.findAll(
          mergedFilter,
          {field: 'transactionDate', direction: 'desc'},
        );
        if (!cancelled) {
          setTransactions(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mergedFilter, refetchKey]);

  return {transactions, isLoading, error, refetch};
}

export type UseTransactionByIdReturn = {
  transaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useTransactionById(id: string): UseTransactionByIdReturn {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!id) {
      setTransaction(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const data = await ds.transactions.findById(id);
        if (!cancelled) {
          setTransaction(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, refetchKey]);

  return {transaction, isLoading, error, refetch};
}
