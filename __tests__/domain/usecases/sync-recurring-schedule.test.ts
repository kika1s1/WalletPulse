import {makeSyncRecurringSchedule} from '@domain/usecases/sync-recurring-schedule';
import type {Transaction} from '@domain/entities/Transaction';
import type {RecurringSchedule} from '@domain/entities/RecurringSchedule';
import type {IRecurringScheduleRepository} from '@domain/repositories/IRecurringScheduleRepository';

function makeRepoMock(): jest.Mocked<IRecurringScheduleRepository> {
  return {
    findById: jest.fn(),
    findByTemplateTransactionId: jest.fn().mockResolvedValue(null),
    findActive: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function tx(over: Partial<Transaction> = {}): Transaction {
  const now = Date.now();
  return {
    id: 'tx-1',
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    amount: 1000,
    currency: 'USD',
    type: 'expense',
    description: 'Lunch',
    merchant: 'Cafe',
    source: 'manual',
    sourceHash: '',
    tags: ['food'],
    receiptUri: '',
    isRecurring: true,
    recurrenceRule: 'MONTHLY',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: now,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('syncRecurringSchedule', () => {
  const fixedNow = new Date(2025, 0, 15, 12, 0, 0).getTime();

  function makeSync(repo: IRecurringScheduleRepository) {
    let seq = 0;
    return makeSyncRecurringSchedule({
      recurringSchedules: repo,
      now: () => fixedNow,
      generateId: () => `rs-${++seq}`,
    });
  }

  it('does nothing when isRecurring is false and no schedule exists', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({isRecurring: false, recurrenceRule: ''}));
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.deactivate).not.toHaveBeenCalled();
  });

  it('does nothing when isRecurring is true but recurrenceRule is empty', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({isRecurring: true, recurrenceRule: ''}));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does nothing for transfer transactions even if isRecurring is true', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({type: 'transfer'}));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates a new schedule when isRecurring=true and no existing schedule', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    const transaction = tx({transactionDate: fixedNow, recurrenceRule: 'MONTHLY'});

    await sync(transaction);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0] as RecurringSchedule;
    expect(saved.id).toBe('rs-1');
    expect(saved.templateTransactionId).toBe(transaction.id);
    expect(saved.walletId).toBe(transaction.walletId);
    expect(saved.categoryId).toBe(transaction.categoryId);
    expect(saved.amount).toBe(transaction.amount);
    expect(saved.currency).toBe('USD');
    expect(saved.merchant).toBe(transaction.merchant);
    expect(saved.tags).toEqual(transaction.tags);
    expect(saved.cadence).toBe('monthly');
    expect(saved.isActive).toBe(true);
    expect(saved.nextDueDate).toBeGreaterThan(fixedNow);
  });

  it('preserves transaction type on the schedule (income -> income)', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({type: 'income', recurrenceRule: 'WEEKLY'}));
    const saved = repo.save.mock.calls[0][0] as RecurringSchedule;
    expect(saved.type).toBe('income');
    expect(saved.cadence).toBe('weekly');
  });

  it.each([
    ['DAILY', 'daily'],
    ['WEEKLY', 'weekly'],
    ['BIWEEKLY', 'biweekly'],
    ['MONTHLY', 'monthly'],
    ['QUARTERLY', 'quarterly'],
    ['YEARLY', 'yearly'],
  ])('maps recurrenceRule %s to cadence %s', async (rule, cadence) => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({recurrenceRule: rule}));
    const saved = repo.save.mock.calls[0][0] as RecurringSchedule;
    expect(saved.cadence).toBe(cadence);
  });

  it('skips when recurrenceRule is unknown', async () => {
    const repo = makeRepoMock();
    const sync = makeSync(repo);
    await sync(tx({recurrenceRule: 'CUSTOM'}));
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('updates existing schedule rather than creating a duplicate (idempotent)', async () => {
    const repo = makeRepoMock();
    const existing: RecurringSchedule = {
      id: 'existing-id',
      templateTransactionId: 'tx-1',
      walletId: 'old-wallet',
      categoryId: 'old-cat',
      type: 'expense',
      amount: 500,
      currency: 'EUR',
      merchant: 'Old',
      description: '',
      tags: [],
      cadence: 'weekly',
      nextDueDate: fixedNow + 1000,
      isActive: true,
      createdAt: fixedNow - 1000,
      updatedAt: fixedNow - 1000,
    };
    repo.findByTemplateTransactionId.mockResolvedValue(existing);
    const sync = makeSync(repo);

    await sync(tx({transactionDate: fixedNow}));

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = repo.update.mock.calls[0][0] as RecurringSchedule;
    expect(updated.id).toBe('existing-id');
    expect(updated.cadence).toBe('monthly');
    expect(updated.amount).toBe(1000);
    expect(updated.walletId).toBe('wallet-1');
    expect(updated.isActive).toBe(true);
  });

  it('reactivates a previously-deactivated schedule when toggle goes back on', async () => {
    const repo = makeRepoMock();
    const existing: RecurringSchedule = {
      id: 'existing-id',
      templateTransactionId: 'tx-1',
      walletId: 'wallet-1', categoryId: 'cat-1', type: 'expense',
      amount: 1000, currency: 'USD', merchant: 'Cafe', description: '',
      tags: [], cadence: 'monthly', nextDueDate: fixedNow + 1000,
      isActive: false, createdAt: fixedNow, updatedAt: fixedNow,
    };
    repo.findByTemplateTransactionId.mockResolvedValue(existing);
    const sync = makeSync(repo);

    await sync(tx());

    const updated = repo.update.mock.calls[0][0] as RecurringSchedule;
    expect(updated.isActive).toBe(true);
  });

  it('deactivates schedule when isRecurring is toggled off', async () => {
    const repo = makeRepoMock();
    const existing: RecurringSchedule = {
      id: 'existing-id',
      templateTransactionId: 'tx-1',
      walletId: 'wallet-1', categoryId: 'cat-1', type: 'expense',
      amount: 1000, currency: 'USD', merchant: 'Cafe', description: '',
      tags: [], cadence: 'monthly', nextDueDate: fixedNow + 1000,
      isActive: true, createdAt: fixedNow, updatedAt: fixedNow,
    };
    repo.findByTemplateTransactionId.mockResolvedValue(existing);
    const sync = makeSync(repo);

    await sync(tx({isRecurring: false, recurrenceRule: ''}));

    expect(repo.deactivate).toHaveBeenCalledWith('existing-id', fixedNow);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
