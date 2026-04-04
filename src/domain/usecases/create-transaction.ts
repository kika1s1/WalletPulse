import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {
  createTransaction,
  type CreateTransactionInput,
  type Transaction,
  type TransactionType,
} from '@domain/entities/Transaction';

type Deps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

function ledgerImpact(type: TransactionType, amount: number): number {
  if (type === 'income') {
    return amount;
  }
  return -amount;
}

export function makeCreateTransaction({transactionRepo, walletRepo}: Deps) {
  return async (input: CreateTransactionInput): Promise<Transaction> => {
    const transaction = createTransaction(input);

    if (transaction.sourceHash.trim() !== '') {
      const existing = await transactionRepo.findBySourceHash(transaction.sourceHash);
      if (existing) {
        throw new Error('Duplicate transaction for source hash');
      }
    }

    await transactionRepo.save(transaction);

    const wallet = await walletRepo.findById(transaction.walletId);
    if (wallet) {
      const delta = ledgerImpact(transaction.type, transaction.amount);
      await walletRepo.updateBalance(wallet.id, wallet.balance + delta);
    }

    return transaction;
  };
}
