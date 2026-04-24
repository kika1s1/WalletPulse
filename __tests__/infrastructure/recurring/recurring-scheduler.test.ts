import type {CreateTransactionInput, Transaction} from '@domain/entities/Transaction';
import type {Subscription} from '@domain/entities/Subscription';
import type {BillReminder} from '@domain/entities/BillReminder';
import type {Wallet} from '@domain/entities/Wallet';
import type {RecurringSchedule} from '@domain/entities/RecurringSchedule';
import {
  processRecurringItemsWithDeps,
  type RecurringChargeNotification,
  type RecurringSchedulerDeps,
} from '@infrastructure/recurring/recurring-scheduler-core';

function baseSubscription(over: Partial<Subscription> = {}): Subscription {
  const now = Date.now();
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 1599,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now - 1000,
    categoryId: 'cat-1',
    isActive: true,
    icon: 'play',
    color: '#000000',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function baseBill(refNow: number, over: Partial<BillReminder> = {}): BillReminder {
  return {
    id: 'bill-1',
    name: 'Rent',
    amount: 120000,
    currency: 'USD',
    dueDate: refNow - 1000,
    recurrence: 'once',
    categoryId: 'cat-2',
    walletId: 'wallet-1',
    isPaid: false,
    remindDaysBefore: 3,
    createdAt: refNow,
    updatedAt: refNow,
    ...over,
  };
}

function baseWallet(): Wallet {
  const now = Date.now();
  return {
    id: 'wallet-1',
    name: 'Main',
    currency: 'USD',
    balance: 50000,
    isActive: true,
    icon: 'wallet',
    color: '#111111',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe('processRecurringItemsWithDeps', () => {
  const fixedNow = new Date(2025, 6, 1, 12, 0, 0).getTime();

  function makeDeps(partial: Partial<RecurringSchedulerDeps> = {}): RecurringSchedulerDeps {
    let idSeq = 0;
    const createTransaction = jest.fn(async (input: CreateTransactionInput): Promise<Transaction> => ({
      id: input.id,
      walletId: input.walletId,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      description: input.description ?? '',
      merchant: input.merchant ?? '',
      source: input.source,
      sourceHash: input.sourceHash ?? '',
      tags: input.tags ?? [],
      receiptUri: input.receiptUri ?? '',
      isRecurring: input.isRecurring ?? false,
      recurrenceRule: input.recurrenceRule ?? '',
      confidence: input.confidence ?? 1,
      notes: input.notes ?? '',
      isTemplate: input.isTemplate ?? false,
      templateName: input.templateName ?? '',
      transactionDate: input.transactionDate,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    }));

    return {
      createTransaction,
      subscriptions: {
        findActive: jest.fn().mockResolvedValue([]),
        findById: jest.fn(),
        findAll: jest.fn(),
        findCancelled: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        delete: jest.fn(),
      },
      billReminders: {
        findUnpaid: jest.fn().mockResolvedValue([]),
        findById: jest.fn(),
        findAll: jest.fn(),
        findPaid: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        markPaid: jest.fn(),
        delete: jest.fn(),
      },
      recurringSchedules: {
        findById: jest.fn(),
        findByTemplateTransactionId: jest.fn(),
        findActive: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
        delete: jest.fn(),
      },
      wallets: {
        findActive: jest.fn().mockResolvedValue([baseWallet()]),
        findById: jest.fn(),
        findAll: jest.fn(),
        findByCurrency: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        updateBalance: jest.fn(),
      },
      now: () => fixedNow,
      generateId: jest.fn(() => {
        idSeq += 1;
        return `gen-${idSeq}`;
      }),
      ...partial,
    };
  }

  it('does nothing when no active wallet', async () => {
    const deps = makeDeps();
    (deps.wallets.findActive as jest.Mock).mockResolvedValue([]);

    await processRecurringItemsWithDeps(deps);

    expect(deps.createTransaction).not.toHaveBeenCalled();
  });

  it('creates expense and advances subscription while nextDueDate is in the past', async () => {
    const sub = baseSubscription({nextDueDate: fixedNow - 86400000});
    const deps = makeDeps();
    (deps.subscriptions.findActive as jest.Mock).mockResolvedValue([sub]);
    (deps.subscriptions.update as jest.Mock).mockResolvedValue(undefined);

    await processRecurringItemsWithDeps(deps);

    expect(deps.createTransaction).toHaveBeenCalledTimes(1);
    const call = (deps.createTransaction as jest.Mock).mock.calls[0][0];
    expect(call.type).toBe('expense');
    expect(call.amount).toBe(sub.amount);
    expect(call.currency).toBe('USD');
    expect(call.merchant).toBe(sub.name);
    expect(call.walletId).toBe('wallet-1');
    expect(call.categoryId).toBe(sub.categoryId);

    expect(deps.subscriptions.update).toHaveBeenCalled();
    const updated = (deps.subscriptions.update as jest.Mock).mock.calls[0][0] as Subscription;
    expect(updated.id).toBe(sub.id);
    expect(updated.nextDueDate).toBeGreaterThan(fixedNow);
  });

  it('marks unpaid bill due as paid and does not create next bill when once', async () => {
    const bill = baseBill(fixedNow, {recurrence: 'once'});
    const deps = makeDeps();
    (deps.billReminders.findUnpaid as jest.Mock).mockResolvedValue([bill]);

    await processRecurringItemsWithDeps(deps);

    expect(deps.createTransaction).toHaveBeenCalledTimes(1);
    expect(deps.billReminders.markPaid).toHaveBeenCalledWith(bill.id, 'gen-1');
    expect(deps.billReminders.save).not.toHaveBeenCalled();
  });

  it('creates next bill when recurrence is monthly', async () => {
    const bill = baseBill(fixedNow, {recurrence: 'monthly'});
    const deps = makeDeps();
    (deps.billReminders.findUnpaid as jest.Mock).mockResolvedValue([bill]);

    await processRecurringItemsWithDeps(deps);

    expect(deps.billReminders.markPaid).toHaveBeenCalled();
    expect(deps.billReminders.save).toHaveBeenCalled();
    const saved = (deps.billReminders.save as jest.Mock).mock.calls[0][0] as BillReminder;
    expect(saved.isPaid).toBe(false);
    expect(saved.dueDate).toBeGreaterThan(bill.dueDate);
    expect(saved.id).toBe('gen-2');
    expect(saved.walletId).toBe('wallet-1');
  });

  it('uses bill walletId for the transaction instead of default wallet', async () => {
    const bill = baseBill(fixedNow, {recurrence: 'once', walletId: 'bill-wallet-99'});
    const deps = makeDeps();
    (deps.billReminders.findUnpaid as jest.Mock).mockResolvedValue([bill]);

    await processRecurringItemsWithDeps(deps);

    const call = (deps.createTransaction as jest.Mock).mock.calls[0][0];
    expect(call.walletId).toBe('bill-wallet-99');
  });

  it('falls back to default wallet when bill has no walletId', async () => {
    const bill = baseBill(fixedNow, {recurrence: 'once', walletId: ''});
    const deps = makeDeps();
    (deps.billReminders.findUnpaid as jest.Mock).mockResolvedValue([bill]);

    await processRecurringItemsWithDeps(deps);

    const call = (deps.createTransaction as jest.Mock).mock.calls[0][0];
    expect(call.walletId).toBe('wallet-1');
  });

  describe('recurring schedules', () => {
    function baseSchedule(over: Partial<RecurringSchedule> = {}): RecurringSchedule {
      return {
        id: 'rs-1',
        templateTransactionId: 'tx-template',
        walletId: 'wallet-99',
        categoryId: 'cat-r',
        type: 'expense',
        amount: 1234,
        currency: 'USD',
        merchant: 'Gym',
        description: 'Membership',
        tags: ['fitness'],
        cadence: 'monthly',
        nextDueDate: fixedNow - 86400000,
        isActive: true,
        createdAt: fixedNow - 86400000 * 30,
        updatedAt: fixedNow - 86400000 * 30,
        ...over,
      };
    }

    it('processes a due recurring schedule and advances its nextDueDate', async () => {
      const sched = baseSchedule();
      const deps = makeDeps();
      (deps.recurringSchedules.findActive as jest.Mock).mockResolvedValue([sched]);

      await processRecurringItemsWithDeps(deps);

      expect(deps.createTransaction).toHaveBeenCalledTimes(1);
      const call = (deps.createTransaction as jest.Mock).mock.calls[0][0];
      expect(call.type).toBe('expense');
      expect(call.amount).toBe(sched.amount);
      expect(call.walletId).toBe('wallet-99');
      expect(call.categoryId).toBe(sched.categoryId);
      expect(call.merchant).toBe('Gym');
      expect(call.tags).toEqual(['fitness']);

      expect(deps.recurringSchedules.update).toHaveBeenCalled();
      const updated = (deps.recurringSchedules.update as jest.Mock).mock.calls[0][0] as RecurringSchedule;
      expect(updated.nextDueDate).toBeGreaterThan(fixedNow);
    });

    it('preserves income type when posting transactions', async () => {
      const sched = baseSchedule({type: 'income', merchant: 'Acme Salary'});
      const deps = makeDeps();
      (deps.recurringSchedules.findActive as jest.Mock).mockResolvedValue([sched]);

      await processRecurringItemsWithDeps(deps);

      const call = (deps.createTransaction as jest.Mock).mock.calls[0][0];
      expect(call.type).toBe('income');
    });

    it('catches up multiple periods when several due dates have passed', async () => {
      const sched = baseSchedule({
        cadence: 'daily',
        nextDueDate: fixedNow - 3 * 86400000,
      });
      const deps = makeDeps();
      (deps.recurringSchedules.findActive as jest.Mock).mockResolvedValue([sched]);

      await processRecurringItemsWithDeps(deps);

      // 3 days behind + today's run -> at least 3 catch-up postings
      expect((deps.createTransaction as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('skips schedules whose nextDueDate is in the future', async () => {
      const sched = baseSchedule({nextDueDate: fixedNow + 86400000});
      const deps = makeDeps();
      (deps.recurringSchedules.findActive as jest.Mock).mockResolvedValue([sched]);

      await processRecurringItemsWithDeps(deps);

      expect(deps.createTransaction).not.toHaveBeenCalled();
      expect(deps.recurringSchedules.update).not.toHaveBeenCalled();
    });

    it('emits a notification payload for each created transaction', async () => {
      const sched = baseSchedule({type: 'income', merchant: 'Acme Salary'});
      const emit = jest.fn();
      const deps = makeDeps({emit});
      (deps.recurringSchedules.findActive as jest.Mock).mockResolvedValue([sched]);

      await processRecurringItemsWithDeps(deps);

      expect(emit).toHaveBeenCalledTimes(1);
      const payload = emit.mock.calls[0][0] as RecurringChargeNotification;
      expect(payload.source).toBe('recurring');
      expect(payload.type).toBe('income');
      expect(payload.merchant).toBe('Acme Salary');
      expect(payload.walletId).toBe('wallet-99');
    });

    it('emits notifications for subscription and bill auto-postings too', async () => {
      const sub = baseSubscription({nextDueDate: fixedNow - 1000});
      const bill = baseBill(fixedNow, {recurrence: 'once'});
      const emit = jest.fn();
      const deps = makeDeps({emit});
      (deps.subscriptions.findActive as jest.Mock).mockResolvedValue([sub]);
      (deps.billReminders.findUnpaid as jest.Mock).mockResolvedValue([bill]);

      await processRecurringItemsWithDeps(deps);

      const sources = emit.mock.calls.map((c) => (c[0] as RecurringChargeNotification).source);
      expect(sources).toContain('subscription');
      expect(sources).toContain('bill');
    });
  });
});
