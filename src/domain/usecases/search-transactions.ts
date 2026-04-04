import type {Transaction} from '@domain/entities/Transaction';
import type {
  ITransactionRepository,
  TransactionFilter,
  TransactionSort,
} from '@domain/repositories/ITransactionRepository';

type Deps = {
  transactionRepo: ITransactionRepository;
};

export type SearchTransactionsApi = {
  execute(
    query: string,
    filter?: TransactionFilter,
    sort?: TransactionSort,
  ): Promise<Transaction[]>;
  getCount(query: string, filter?: TransactionFilter): Promise<number>;
};

export function makeSearchTransactions({transactionRepo}: Deps): SearchTransactionsApi {
  return {
    async execute(query, filter, sort) {
      const trimmed = query.trim();
      if (trimmed === '') {
        return [];
      }
      const merged: TransactionFilter = {...filter, searchQuery: trimmed};
      return transactionRepo.findAll(merged, sort);
    },
    async getCount(query, filter) {
      const trimmed = query.trim();
      if (trimmed === '') {
        return 0;
      }
      const merged: TransactionFilter = {...filter, searchQuery: trimmed};
      return transactionRepo.countByFilter(merged);
    },
  };
}
