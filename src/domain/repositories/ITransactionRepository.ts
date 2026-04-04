import type {Transaction, TransactionType, TransactionSource} from '@domain/entities/Transaction';
import type {DateRange} from '@domain/value-objects/DateRange';

export type TransactionFilter = {
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  source?: TransactionSource;
  currency?: string;
  dateRange?: DateRange;
  merchant?: string;
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
};

export type TransactionSortField = 'transactionDate' | 'amount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export type TransactionSort = {
  field: TransactionSortField;
  direction: SortDirection;
};

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findAll(filter?: TransactionFilter, sort?: TransactionSort): Promise<Transaction[]>;
  findByWalletId(walletId: string): Promise<Transaction[]>;
  findByCategoryId(categoryId: string): Promise<Transaction[]>;
  findBySourceHash(hash: string): Promise<Transaction | null>;
  findRecent(limit: number): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
  update(transaction: Transaction): Promise<void>;
  delete(id: string): Promise<void>;
  countByFilter(filter: TransactionFilter): Promise<number>;
  sumByFilter(filter: TransactionFilter): Promise<number>;
}
