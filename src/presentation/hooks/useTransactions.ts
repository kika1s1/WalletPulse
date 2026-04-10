import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import database from '@data/database';
import TransactionModel from '@data/database/models/TransactionModel';
import {Q} from '@nozbe/watermelondb';
import type {Where} from '@nozbe/watermelondb/QueryDescription';
import {toDomain} from '@data/mappers/transaction-mapper';
import type {Transaction} from '@domain/entities/Transaction';
import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {useFilterStore, type TransactionTypeFilter} from '@presentation/stores/useFilterStore';

export type UseTransactionsReturn = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export type UseTransactionsOptions = {
  filter?: TransactionFilter;
  /** When true, applies filters from useFilterStore (default: true) */
  syncWithFilterStore?: boolean;
};

function transactionModelToDomain(model: TransactionModel): Transaction {
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

function buildQueryConditions(filter?: TransactionFilter): Where[] {
  if (!filter) {
    return [];
  }
  const conditions: Where[] = [];

  if (filter.walletId !== undefined) {
    conditions.push(Q.where('wallet_id', filter.walletId));
  }
  if (filter.categoryId !== undefined) {
    conditions.push(Q.where('category_id', filter.categoryId));
  }
  if (filter.type !== undefined) {
    conditions.push(Q.where('type', filter.type));
  }
  if (filter.source !== undefined) {
    conditions.push(Q.where('source', filter.source));
  }
  if (filter.currency !== undefined) {
    conditions.push(Q.where('currency', filter.currency));
  }
  if (filter.merchant !== undefined) {
    conditions.push(Q.where('merchant', filter.merchant));
  }
  if (filter.dateRange !== undefined) {
    conditions.push(
      Q.where(
        'transaction_date',
        Q.between(filter.dateRange.startMs, filter.dateRange.endMs),
      ),
    );
  }
  if (filter.minAmount !== undefined) {
    conditions.push(Q.where('amount', Q.gte(filter.minAmount)));
  }
  if (filter.maxAmount !== undefined) {
    conditions.push(Q.where('amount', Q.lte(filter.maxAmount)));
  }
  if (filter.searchQuery !== undefined && filter.searchQuery.trim() !== '') {
    const safe = Q.sanitizeLikeString(filter.searchQuery.trim());
    conditions.push(
      Q.or(
        Q.where('description', Q.like(`%${safe}%`)),
        Q.where('merchant', Q.like(`%${safe}%`)),
        Q.where('notes', Q.like(`%${safe}%`)),
      ),
    );
  }
  if (filter.tags !== undefined && filter.tags.length > 0) {
    for (const tag of filter.tags) {
      const safe = Q.sanitizeLikeString(tag);
      conditions.push(Q.where('tags', Q.like(`%${safe}%`)));
    }
  }

  return conditions;
}

function whereClauseFromConditions(conditions: Where[]): Where[] {
  if (conditions.length === 0) {
    return [];
  }
  if (conditions.length === 1) {
    return [conditions[0]];
  }
  return [Q.and(...conditions)];
}

function mergeFiltersFromStore(
  typeFilter: TransactionTypeFilter,
  searchQuery: string,
  selectedWalletId: string | null,
  selectedCategoryId: string | null,
  dateRange: {startMs: number; endMs: number} | null,
  explicit?: TransactionFilter,
): TransactionFilter {
  const base: TransactionFilter = {};
  if (typeFilter !== 'all') {
    base.type = typeFilter;
  }
  if (searchQuery.trim() !== '') {
    base.searchQuery = searchQuery.trim();
  }
  if (selectedWalletId) {
    base.walletId = selectedWalletId;
  }
  if (selectedCategoryId) {
    base.categoryId = selectedCategoryId;
  }
  if (dateRange) {
    base.dateRange = dateRange;
  }
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
    if (!syncWithFilterStore && explicitFilter === undefined) {
      return undefined;
    }
    if (!syncWithFilterStore) {
      return explicitFilter;
    }
    const merged = mergeFiltersFromStore(
      typeFilter,
      searchQuery,
      selectedWalletId,
      selectedCategoryId,
      dateRange,
      explicitFilter,
    );
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [
    syncWithFilterStore,
    explicitFilter,
    typeFilter,
    searchQuery,
    selectedWalletId,
    selectedCategoryId,
    dateRange,
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasReceivedData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<TransactionModel>('transactions');
    const conditions = buildQueryConditions(mergedFilter);
    const wherePart = whereClauseFromConditions(conditions);
    const query =
      wherePart.length > 0
        ? collection.query(
            ...wherePart,
            Q.sortBy('transaction_date', Q.desc),
          )
        : collection.query(Q.sortBy('transaction_date', Q.desc));

    if (!hasReceivedData.current) {
      setIsLoading(true);
    }
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasReceivedData.current = true;
        setTransactions(models.map(transactionModelToDomain));
        setIsLoading(false);
        setError(null);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
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
      setError(null);
      return;
    }

    const collection = database.get<TransactionModel>('transactions');
    setIsLoading(true);
    setError(null);

    const subscription = collection.findAndObserve(id).subscribe({
      next: (model) => {
        setTransaction(transactionModelToDomain(model));
        setIsLoading(false);
        setError(null);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTransaction(null);
        setIsLoading(false);
      },
      complete: () => {
        setTransaction(null);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [id, refetchKey]);

  return {transaction, isLoading, error, refetch};
}
