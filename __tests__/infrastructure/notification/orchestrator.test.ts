import {makeNotificationOrchestrator} from '@infrastructure/notification/orchestrator';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {DedupService} from '@infrastructure/notification/dedup-service';

function mockTxRepo(): jest.Mocked<ITransactionRepository> {
  return {findById: jest.fn(), findAll: jest.fn(), findByWalletId: jest.fn(), findByFilter: jest.fn(), findBySourceHash: jest.fn().mockResolvedValue(null), save: jest.fn().mockResolvedValue(undefined), update: jest.fn(), delete: jest.fn(), count: jest.fn()} as any;
}

function mockWalletRepo(): jest.Mocked<IWalletRepository> {
  return {findById: jest.fn().mockResolvedValue({id: 'w-1', name: 'Main', balance: 100000, currency: 'USD', isActive: true, icon: 'cash-multiple', color: '#6C5CE7', sortOrder: 0, createdAt: Date.now(), updatedAt: Date.now()}), findAll: jest.fn(), save: jest.fn(), update: jest.fn(), updateBalance: jest.fn().mockResolvedValue(undefined), delete: jest.fn()} as any;
}

function mockLogRepo(): jest.Mocked<INotificationLogRepository> {
  return {findById: jest.fn(), findAll: jest.fn(), findRecent: jest.fn(), findByPackageName: jest.fn(), findFailed: jest.fn(), save: jest.fn().mockResolvedValue(undefined), delete: jest.fn(), deleteOlderThan: jest.fn()};
}

function mockCategoryRepo(): jest.Mocked<ICategoryRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn().mockResolvedValue([{id: 'cat-other', name: 'Other', icon: 'dots-horizontal', color: '#B2BEC3', type: 'expense', isDefault: true, isArchived: false, sortOrder: 99, createdAt: Date.now(), updatedAt: Date.now()}]),
    findByType: jest.fn(),
    findDefaults: jest.fn(),
    findSubcategories: jest.fn(),
    findByName: jest.fn().mockImplementation(async (name: string) => {
      const map: Record<string, any> = {
        'Shopping': {id: 'cat-shopping', name: 'Shopping', icon: 'shopping', color: '#6C5CE7', type: 'expense'},
        'Transportation': {id: 'cat-transport', name: 'Transportation', icon: 'car', color: '#0984E3', type: 'expense'},
        'Entertainment': {id: 'cat-entertain', name: 'Entertainment', icon: 'movie', color: '#E17055', type: 'expense'},
      };
      return map[name] ?? null;
    }),
    save: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    delete: jest.fn(),
  };
}

function mockDedup(): jest.Mocked<DedupService> {
  return {isDuplicate: jest.fn().mockResolvedValue({isDuplicate: false, hash: 'h-123'}), markSeen: jest.fn(), clear: jest.fn()};
}

describe('Notification Orchestrator', () => {
  it('creates transaction from valid Payoneer notification', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup();
    const c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.payoneer.android', title: 'Payment Received', body: 'You received 500.00 USD from Test Client', receivedAt: Date.now()});
    expect(r.status).toBe('created');
    expect(r.transaction!.amount).toBe(50000);
    expect(r.transaction!.currency).toBe('USD');
    expect(r.transaction!.type).toBe('income');
    expect(r.transaction!.source).toBe('payoneer');
    expect(tx.save).toHaveBeenCalled();
    expect(d.markSeen).toHaveBeenCalledWith('h-123');
    expect(log.save).toHaveBeenCalled();
  });

  it('rejects duplicate notifications', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    d.isDuplicate.mockResolvedValue({isDuplicate: true, hash: 'dup'});
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.payoneer.android', title: 'Payment Received', body: 'You received 500.00 USD from Test', receivedAt: Date.now()});
    expect(r.status).toBe('duplicate');
    expect(tx.save).not.toHaveBeenCalled();
  });

  it('returns no_parser for unsupported apps', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.random.app', title: 'Hi', body: 'World', receivedAt: Date.now()});
    expect(r.status).toBe('no_parser');
    expect(log.save).toHaveBeenCalled();
  });

  it('returns parse_failed for non-financial notifications', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.payoneer.android', title: 'Account Update', body: 'Your profile updated', receivedAt: Date.now()});
    expect(r.status).toBe('parse_failed');
  });

  it('returns no_wallet when no default wallet', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => null});
    const r = await orch({packageName: 'com.grey.android', title: 'Card Transaction', body: 'Card payment of 45.99 USD at Amazon.com', receivedAt: Date.now()});
    expect(r.status).toBe('no_wallet');
    expect(r.parsed).toBeDefined();
  });

  it('auto-categorizes by merchant keyword and resolves DB id', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    await orch({packageName: 'com.grey.android', title: 'Card Transaction', body: 'Card payment of 45.99 USD at Amazon.com', receivedAt: Date.now()});
    expect(tx.save.mock.calls[0]?.[0]?.categoryId).toBe('cat-shopping');
  });

  it('processes Grey card transaction end-to-end', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.grey.android', title: 'Card Transaction', body: 'Card payment of 120.00 GBP at Uber Technologies', receivedAt: Date.now()});
    expect(r.status).toBe('created');
    expect(r.transaction!.amount).toBe(12000);
    expect(r.transaction!.merchant).toBe('Uber Technologies');
  });

  it('processes Dukascopy card payment end-to-end', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => 'w-1'});
    const r = await orch({packageName: 'com.dukascopy.bank', title: 'Card Payment', body: 'Card charged: 150.00 EUR - Netflix Subscription', receivedAt: Date.now()});
    expect(r.status).toBe('created');
    expect(r.transaction!.amount).toBe(15000);
    expect(r.transaction!.currency).toBe('EUR');
    expect(r.transaction!.merchant).toBe('Netflix Subscription');
  });

  it('always logs notifications', async () => {
    const tx = mockTxRepo(), w = mockWalletRepo(), log = mockLogRepo(), d = mockDedup(), c = mockCategoryRepo();
    const orch = makeNotificationOrchestrator({transactionRepo: tx, walletRepo: w, notificationLogRepo: log, categoryRepo: c, dedupService: d, getDefaultWalletId: async () => null});
    await orch({packageName: 'com.payoneer.android', title: 'Payment Received', body: 'You received 500.00 USD from Test', receivedAt: Date.now()});
    expect(log.save).toHaveBeenCalled();
  });
});
