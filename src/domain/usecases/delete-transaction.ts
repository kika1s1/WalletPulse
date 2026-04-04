import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {TransactionType} from '@domain/entities/Transaction';

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

export function makeDeleteTransaction({transactionRepo, walletRepo}: Deps) {
  return async (id: string): Promise<void> => {
    const existing = await transactionRepo.findById(id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    const oldDelta = ledgerImpact(existing.type, existing.amount);
    const wallet = await walletRepo.findById(existing.walletId);
    if (wallet) {
      await walletRepo.updateBalance(existing.walletId, wallet.balance - oldDelta);
    }

    await transactionRepo.delete(id);
  };
}
