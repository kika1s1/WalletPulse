import {makeGetTransactions} from '@domain/usecases/get-transactions';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';
import {createDateRange} from '@domain/value-objects/DateRange';

function createMockTransactionRepo(): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWalletId: jest.fn(),
    findByCategoryId: jest.fn(),
    findBySourceHash: jest.fn(),
    findRecent: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByFilter: jest.fn(),
    sumByFilter: jest.fn(),
  };
}

const sampleTxn: Transaction = {
  id: 'txn-1',
  walletId: 'w1',
  categoryId: 'cat-1',
  amount: 1000,
  currency: 'USD',
  type: 'expense',
  description: '',
  merchant: '',
  source: 'manual',
  sourceHash: '',
  tags: [],
  receiptUri: '',
  isRecurring: false,
  recurrenceRule: '',
  confidence: 1,
  notes: '',
  isTemplate: false,
  templateName: '',
  transactionDate: 1_704_000_000_000,
  createdAt: 1_704_000_000_000,
  updatedAt: 1_704_000_000_000,
};

describe('makeGetTransactions', () => {
  it('returns filtered results from findAll', async () => {
    const transactionRepo = createMockTransactionRepo();
    const filtered = [sampleTxn];
    transactionRepo.findAll.mockResolvedValue(filtered);
    const api = makeGetTransactions({transactionRepo});

    const range = createDateRange(1, 2);
    const result = await api.findAll(
      {walletId: 'w1', dateRange: range},
      {field: 'transactionDate', direction: 'desc'},
    );

    expect(result).toEqual(filtered);
    expect(transactionRepo.findAll).toHaveBeenCalledWith(
      {walletId: 'w1', dateRange: range},
      {field: 'transactionDate', direction: 'desc'},
    );
  });

  it('returns recent transactions', async () => {
    const transactionRepo = createMockTransactionRepo();
    const recent = [sampleTxn];
    transactionRepo.findRecent.mockResolvedValue(recent);
    const api = makeGetTransactions({transactionRepo});

    const result = await api.getRecent(10);

    expect(result).toEqual(recent);
    expect(transactionRepo.findRecent).toHaveBeenCalledWith(10);
  });

  it('returns transactions for a wallet', async () => {
    const transactionRepo = createMockTransactionRepo();
    const byWallet = [sampleTxn];
    transactionRepo.findByWalletId.mockResolvedValue(byWallet);
    const api = makeGetTransactions({transactionRepo});

    const result = await api.getByWallet('w1');

    expect(result).toEqual(byWallet);
    expect(transactionRepo.findByWalletId).toHaveBeenCalledWith('w1');
  });
});
