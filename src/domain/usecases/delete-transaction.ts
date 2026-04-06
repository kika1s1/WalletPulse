import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {transactionLedgerDeltaCentsFromTransaction} from '@domain/value-objects/WalletTransferNotes';

type Deps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

export function makeDeleteTransaction({transactionRepo, walletRepo}: Deps) {
  return async (id: string): Promise<void> => {
    const existing = await transactionRepo.findById(id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    const oldDelta = transactionLedgerDeltaCentsFromTransaction(existing);
    const wallet = await walletRepo.findById(existing.walletId);
    if (wallet) {
      await walletRepo.updateBalance(existing.walletId, wallet.balance - oldDelta);
    }

    await transactionRepo.delete(id);
  };
}
