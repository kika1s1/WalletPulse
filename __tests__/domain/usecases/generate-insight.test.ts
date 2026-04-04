import {makeGenerateInsights} from '@domain/usecases/generate-insight';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {Wallet} from '@domain/entities/Wallet';
import {getWeekRange} from '@domain/value-objects/DateRange';

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

function createMockWalletRepo(): jest.Mocked<IWalletRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateBalance: jest.fn(),
  };
}

function baseWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'w1',
    currency: 'USD',
    name: 'Main',
    balance: 100_000,
    isActive: true,
    icon: 'wallet',
    color: '#112233',
    sortOrder: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('makeGenerateInsights', () => {
  it('generates spending change insight when this week is more than 20% over last week', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo();
    walletRepo.findActive.mockResolvedValue([baseWallet()]);

    const nowMs = Date.UTC(2024, 5, 15, 12, 0, 0);
    const thisWeek = getWeekRange(nowMs);
    const lastWeek = getWeekRange(thisWeek.startMs - 1);

    transactionRepo.sumByFilter.mockImplementation(async filter => {
      if (filter.dateRange?.startMs === thisWeek.startMs) {
        return 12_100;
      }
      if (filter.dateRange?.startMs === lastWeek.startMs) {
        return 10_000;
      }
      return 0;
    });

    const api = makeGenerateInsights({transactionRepo, walletRepo});
    const insights = await api.execute(nowMs);

    const spending = insights.find(i => i.type === 'spending_change');
    expect(spending).toBeDefined();
    expect(spending?.severity).toBe('warning');
    expect(transactionRepo.sumByFilter).toHaveBeenCalledWith({
      type: 'expense',
      dateRange: thisWeek,
    });
    expect(transactionRepo.sumByFilter).toHaveBeenCalledWith({
      type: 'expense',
      dateRange: lastWeek,
    });
  });

  it('does not generate spending insight when spending is similar', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo();
    walletRepo.findActive.mockResolvedValue([baseWallet({balance: 100_000})]);

    const nowMs = Date.UTC(2024, 3, 10, 10, 0, 0);
    const thisWeek = getWeekRange(nowMs);
    const lastWeek = getWeekRange(thisWeek.startMs - 1);

    transactionRepo.sumByFilter.mockImplementation(async filter => {
      if (filter.dateRange?.startMs === thisWeek.startMs) {
        return 10_500;
      }
      if (filter.dateRange?.startMs === lastWeek.startMs) {
        return 10_000;
      }
      return 0;
    });

    const api = makeGenerateInsights({transactionRepo, walletRepo});
    const insights = await api.execute(nowMs);

    expect(insights.some(i => i.type === 'spending_change')).toBe(false);
  });

  it('generates low balance insight for wallets under 500 dollars', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo();
    transactionRepo.sumByFilter.mockResolvedValue(5000);
    walletRepo.findActive.mockResolvedValue([
      baseWallet({id: 'low', name: 'Thin', balance: 40_000}),
    ]);

    const api = makeGenerateInsights({transactionRepo, walletRepo});
    const insights = await api.execute(Date.UTC(2024, 1, 1, 0, 0, 0));

    const low = insights.find(i => i.type === 'low_balance');
    expect(low).toBeDefined();
    expect(low?.relatedEntityId).toBe('low');
    expect(low?.severity).toBe('warning');
  });

  it('returns empty array when everything is normal', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo();
    transactionRepo.sumByFilter.mockResolvedValue(8000);
    walletRepo.findActive.mockResolvedValue([baseWallet({balance: 200_000})]);

    const api = makeGenerateInsights({transactionRepo, walletRepo});
    const insights = await api.execute(Date.UTC(2024, 7, 20, 8, 0, 0));

    expect(insights).toEqual([]);
  });

  it('combines multiple insights', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo();

    const nowMs = Date.UTC(2024, 9, 5, 15, 0, 0);
    const thisWeek = getWeekRange(nowMs);
    const lastWeek = getWeekRange(thisWeek.startMs - 1);

    transactionRepo.sumByFilter.mockImplementation(async filter => {
      if (filter.dateRange?.startMs === thisWeek.startMs) {
        return 20_000;
      }
      if (filter.dateRange?.startMs === lastWeek.startMs) {
        return 10_000;
      }
      return 0;
    });

    walletRepo.findActive.mockResolvedValue([
      baseWallet({id: 'ok', balance: 600_000}),
      baseWallet({id: 'risk', name: 'Risk', balance: 10_000}),
    ]);

    const api = makeGenerateInsights({transactionRepo, walletRepo});
    const insights = await api.execute(nowMs);

    expect(insights.some(i => i.type === 'spending_change')).toBe(true);
    expect(insights.some(i => i.type === 'low_balance' && i.relatedEntityId === 'risk')).toBe(
      true,
    );
    expect(insights.length).toBe(2);
  });
});
