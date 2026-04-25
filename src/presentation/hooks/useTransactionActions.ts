import {useCallback, useMemo, useState} from 'react';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {
  makeCreateWalletTransfer,
  type CreateWalletTransferInput,
} from '@domain/usecases/create-wallet-transfer';
import {makeUpdateTransaction} from '@domain/usecases/update-transaction';
import type {UpdateTransactionInput} from '@domain/usecases/update-transaction';
import {makeDeleteTransaction} from '@domain/usecases/delete-transaction';
import {makeBulkUpdateTransactionCategory} from '@domain/usecases/bulk-update-transaction-category';
import {makeBulkUpdateTransactionTags, type BulkTagUpdateMode} from '@domain/usecases/bulk-update-transaction-tags';
import type {BulkUpdateResult} from '@domain/usecases/bulk-update-transaction-category';
import {makeSyncRecurringSchedule} from '@domain/usecases/sync-recurring-schedule';
import type {CreateTransactionInput, Transaction} from '@domain/entities/Transaction';
import {generateId} from '@shared/utils/hash';

export type UseTransactionActionsReturn = {
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  createWalletTransfer: (input: CreateWalletTransferInput) => Promise<[Transaction, Transaction]>;
  updateTransaction: (input: UpdateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteTransactions: (ids: string[]) => Promise<BulkUpdateResult>;
  bulkUpdateCategory: (ids: string[], categoryId: string) => Promise<BulkUpdateResult>;
  bulkUpdateTags: (ids: string[], mode: BulkTagUpdateMode, tags: string[]) => Promise<BulkUpdateResult>;
  isSubmitting: boolean;
  error: string | null;
};

export function useTransactionActions(): UseTransactionActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {create, createTransfer, update, remove, bulkCategory, bulkTags, syncRecurring} = useMemo(() => {
    const {transactions, wallets, recurringSchedules} = getSupabaseDataSource();
    return {
      create: makeCreateTransaction({
        transactionRepo: transactions,
        walletRepo: wallets,
      }),
      createTransfer: makeCreateWalletTransfer({
        transactionRepo: transactions,
        walletRepo: wallets,
      }),
      update: makeUpdateTransaction({
        transactionRepo: transactions,
        walletRepo: wallets,
      }),
      remove: makeDeleteTransaction({
        transactionRepo: transactions,
        walletRepo: wallets,
      }),
      bulkCategory: makeBulkUpdateTransactionCategory({
        transactionRepo: transactions,
      }),
      bulkTags: makeBulkUpdateTransactionTags({
        transactionRepo: transactions,
      }),
      syncRecurring: makeSyncRecurringSchedule({
        recurringSchedules,
        now: () => Date.now(),
        generateId,
      }),
    };
  }, []);

  const createTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await create(input);
        try {
          // Recurring sidecar is best-effort. A failure here must not
          // block the user — the transaction is already saved.
          await syncRecurring(result);
        } catch {
          /* offline-first: ignore */
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [create, syncRecurring],
  );

  const createWalletTransfer = useCallback(
    async (input: CreateWalletTransferInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await createTransfer(input);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [createTransfer],
  );

  const updateTransaction = useCallback(
    async (input: UpdateTransactionInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await update(input);
        try {
          await syncRecurring(result);
        } catch {
          /* offline-first: ignore */
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [update, syncRecurring],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await remove(id);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [remove],
  );

  const deleteTransactions = useCallback(
    async (ids: string[]) => {
      setIsSubmitting(true);
      setError(null);
      const result: BulkUpdateResult = {updatedIds: [], failed: []};
      try {
        for (const id of ids) {
          try {
            await remove(id);
            result.updatedIds.push(id);
          } catch (e) {
            result.failed.push({id, reason: e instanceof Error ? e.message : String(e)});
          }
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [remove],
  );

  const bulkUpdateCategory = useCallback(
    async (ids: string[], categoryId: string) => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await bulkCategory({ids, categoryId});
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [bulkCategory],
  );

  const bulkUpdateTags = useCallback(
    async (ids: string[], mode: BulkTagUpdateMode, tags: string[]) => {
      setIsSubmitting(true);
      setError(null);
      try {
        return await bulkTags({ids, mode, tags});
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [bulkTags],
  );

  return {
    createTransaction,
    createWalletTransfer,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    bulkUpdateCategory,
    bulkUpdateTags,
    isSubmitting,
    error,
  };
}
