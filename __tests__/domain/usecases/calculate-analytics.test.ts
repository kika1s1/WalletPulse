import {makeCalculateAnalytics} from '@domain/usecases/calculate-analytics';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';
import {createDateRange} from '@domain/value-objects/DateRange';
import {calculateChange, calculatePercentage} from '@domain/value-objects/Percentage';

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

function txn(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'categoryId' | 'transactionDate'>): Transaction {
  return {
    walletId: 'w1',
    currency: 'USD',
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
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  } as Transaction;
}

describe('makeCalculateAnalytics', () => {
  it('calculates correct totals from mixed transactions', async () => {
    const transactionRepo = createMockTransactionRepo();
    const t1 = Date.UTC(2024, 0, 10, 12, 0, 0);
    const t2 = Date.UTC(2024, 0, 11, 12, 0, 0);
    transactionRepo.findAll.mockResolvedValue([
      txn({id: '1', type: 'income', amount: 50_000, categoryId: 'c-in', transactionDate: t1}),
      txn({id: '2', type: 'expense', amount: 15_000, categoryId: 'c-a', transactionDate: t1}),
      txn({id: '3', type: 'expense', amount: 5000, categoryId: 'c-b', transactionDate: t2}),
      txn({id: '4', type: 'transfer', amount: 1000, categoryId: 'c-t', transactionDate: t2}),
    ]);
    const api = makeCalculateAnalytics({transactionRepo});

    const summary = await api.execute({});

    expect(summary.totalIncome).toBe(50_000);
    expect(summary.totalExpenses).toBe(20_000);
    expect(summary.netFlow).toBe(30_000);
    expect(summary.transactionCount).toBe(4);
    expect(summary.incomeVsExpenseChange).toEqual(calculateChange(20_000, 50_000));
  });

  it('returns zero-filled summary for empty transactions', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findAll.mockResolvedValue([]);
    const api = makeCalculateAnalytics({transactionRepo});

    const summary = await api.execute({walletId: 'none'});

    expect(summary).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netFlow: 0,
      transactionCount: 0,
      averageTransaction: 0,
      topCategories: [],
      dailySpending: [],
      incomeVsExpenseChange: calculateChange(0, 0),
    });
    expect(transactionRepo.findAll).toHaveBeenCalledWith({walletId: 'none'});
  });

  it('top categories sorted by amount descending, limited to 5', async () => {
    const transactionRepo = createMockTransactionRepo();
    const day = Date.UTC(2024, 2, 1, 12, 0, 0);
    transactionRepo.findAll.mockResolvedValue([
      txn({id: 'a', type: 'expense', amount: 1000, categoryId: 'c-small', transactionDate: day}),
      txn({id: 'b', type: 'expense', amount: 9000, categoryId: 'c-big', transactionDate: day}),
      txn({id: 'c', type: 'expense', amount: 3000, categoryId: 'c-mid', transactionDate: day}),
      txn({id: 'd', type: 'expense', amount: 2000, categoryId: 'c-low', transactionDate: day}),
      txn({id: 'e', type: 'expense', amount: 4000, categoryId: 'c-mid2', transactionDate: day}),
      txn({id: 'f', type: 'expense', amount: 5000, categoryId: 'c-mid3', transactionDate: day}),
      txn({id: 'g', type: 'expense', amount: 6000, categoryId: 'c-mid4', transactionDate: day}),
    ]);
    const api = makeCalculateAnalytics({transactionRepo});
    const summary = await api.execute({});

    const totalExp = 30_000;
    expect(summary.topCategories).toHaveLength(5);
    expect(summary.topCategories[0].categoryId).toBe('c-big');
    expect(summary.topCategories[0].total).toBe(9000);
    expect(summary.topCategories[0].percentage).toEqual(calculatePercentage(9000, totalExp));
    expect(summary.topCategories.map(c => c.categoryId)).toEqual([
      'c-big',
      'c-mid4',
      'c-mid3',
      'c-mid2',
      'c-mid',
    ]);
  });

  it('daily spending grouped correctly', async () => {
    const transactionRepo = createMockTransactionRepo();
    const d1 = Date.UTC(2024, 4, 1, 10, 0, 0);
    const d2 = Date.UTC(2024, 4, 2, 10, 0, 0);
    transactionRepo.findAll.mockResolvedValue([
      txn({id: '1', type: 'expense', amount: 3000, categoryId: 'c1', transactionDate: d2}),
      txn({id: '2', type: 'expense', amount: 2000, categoryId: 'c1', transactionDate: d1}),
      txn({id: '3', type: 'expense', amount: 1000, categoryId: 'c2', transactionDate: d1}),
    ]);
    const api = makeCalculateAnalytics({transactionRepo});
    const summary = await api.execute({});

    expect(summary.dailySpending).toEqual([
      {date: '2024-05-01', amount: 3000},
      {date: '2024-05-02', amount: 3000},
    ]);
  });

  it('average transaction calculated from expenses only', async () => {
    const transactionRepo = createMockTransactionRepo();
    const day = Date.UTC(2024, 6, 1, 12, 0, 0);
    transactionRepo.findAll.mockResolvedValue([
      txn({id: '1', type: 'income', amount: 99_000, categoryId: 'in', transactionDate: day}),
      txn({id: '2', type: 'expense', amount: 12_000, categoryId: 'e1', transactionDate: day}),
      txn({id: '3', type: 'expense', amount: 8000, categoryId: 'e2', transactionDate: day}),
    ]);
    const api = makeCalculateAnalytics({transactionRepo});
    const summary = await api.execute({});

    expect(summary.totalExpenses).toBe(20_000);
    expect(summary.averageTransaction).toBe(10_000);
  });

  it('passes filter to findAll', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findAll.mockResolvedValue([]);
    const api = makeCalculateAnalytics({transactionRepo});
    const range = createDateRange(1, 2);

    await api.execute({dateRange: range, type: 'expense'});

    expect(transactionRepo.findAll).toHaveBeenCalledWith({dateRange: range, type: 'expense'});
  });
});
