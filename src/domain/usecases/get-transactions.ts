import type {
  ITransactionRepository,
  TransactionFilter,
  TransactionSort,
} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';

type Deps = {
  transactionRepo: ITransactionRepository;
};

export type GetTransactionsApi = {
  findAll(filter?: TransactionFilter, sort?: TransactionSort): Promise<Transaction[]>;
  getRecent(limit: number): Promise<Transaction[]>;
  getByWallet(walletId: string): Promise<Transaction[]>;
};

export function makeGetTransactions({transactionRepo}: Deps): GetTransactionsApi {
  return {
    findAll(filter?: TransactionFilter, sort?: TransactionSort) {
      return transactionRepo.findAll(filter, sort);
    },
    getRecent(limit: number) {
      return transactionRepo.findRecent(limit);
    },
    getByWallet(walletId: string) {
      return transactionRepo.findByWalletId(walletId);
    },
  };
}
