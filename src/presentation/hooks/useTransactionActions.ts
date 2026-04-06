import {useCallback, useMemo, useState} from 'react';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {
  makeCreateWalletTransfer,
  type CreateWalletTransferInput,
} from '@domain/usecases/create-wallet-transfer';
import {makeUpdateTransaction} from '@domain/usecases/update-transaction';
import type {UpdateTransactionInput} from '@domain/usecases/update-transaction';
import {makeDeleteTransaction} from '@domain/usecases/delete-transaction';
import type {CreateTransactionInput, Transaction} from '@domain/entities/Transaction';

export type UseTransactionActionsReturn = {
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  createWalletTransfer: (input: CreateWalletTransferInput) => Promise<[Transaction, Transaction]>;
  updateTransaction: (input: UpdateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function useTransactionActions(): UseTransactionActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {create, createTransfer, update, remove} = useMemo(() => {
    const {transactions, wallets} = getLocalDataSource();
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
    };
  }, []);

  const createTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await create(input);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [create],
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
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [update],
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

  return {
    createTransaction,
    createWalletTransfer,
    updateTransaction,
    deleteTransaction,
    isSubmitting,
    error,
  };
}
