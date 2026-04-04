import {makeSearchTransactions} from '@domain/usecases/search-transactions';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';

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
  merchant: 'Coffee',
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

describe('makeSearchTransactions', () => {
  it('passes search query to repo filter', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findAll.mockResolvedValue([sampleTxn]);
    const api = makeSearchTransactions({transactionRepo});

    await api.execute('coffee');

    expect(transactionRepo.findAll).toHaveBeenCalledWith(
      {searchQuery: 'coffee'},
      undefined,
    );
  });

  it('merges additional filter params with search query', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findAll.mockResolvedValue([]);
    const api = makeSearchTransactions({transactionRepo});

    await api.execute('rent', {walletId: 'w-99', type: 'expense'}, {
      field: 'amount',
      direction: 'asc',
    });

    expect(transactionRepo.findAll).toHaveBeenCalledWith(
      {walletId: 'w-99', type: 'expense', searchQuery: 'rent'},
      {field: 'amount', direction: 'asc'},
    );
  });

  it('returns empty array for empty query and trims whitespace', async () => {
    const transactionRepo = createMockTransactionRepo();
    const api = makeSearchTransactions({transactionRepo});

    expect(await api.execute('')).toEqual([]);
    expect(await api.execute('   ')).toEqual([]);
    expect(transactionRepo.findAll).not.toHaveBeenCalled();
  });

  it('getCount returns number from countByFilter', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.countByFilter.mockResolvedValue(7);
    const api = makeSearchTransactions({transactionRepo});

    const count = await api.getCount('query', {currency: 'USD'});

    expect(count).toBe(7);
    expect(transactionRepo.countByFilter).toHaveBeenCalledWith({
      currency: 'USD',
      searchQuery: 'query',
    });
  });
});
