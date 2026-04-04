import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';

export type CalculateWalletBalanceDeps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

export type CalculateWalletBalanceOptions = {
  persistBalance?: boolean;
};

export function makeCalculateWalletBalance(deps: CalculateWalletBalanceDeps) {
  return async function execute(
    walletId: string,
    options?: CalculateWalletBalanceOptions,
  ): Promise<number> {
    const transactions = await deps.transactionRepo.findByWalletId(walletId);
    let balanceCents = 0;
    for (const t of transactions) {
      if (t.type === 'income') {
        balanceCents += t.amount;
      } else if (t.type === 'expense' || t.type === 'transfer') {
        balanceCents -= t.amount;
      }
    }
    if (options?.persistBalance === true) {
      await deps.walletRepo.updateBalance(walletId, balanceCents);
    }
    return balanceCents;
  };
}
