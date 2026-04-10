import type {CreateTransactionInput, Transaction} from '@domain/entities/Transaction';
import type {Subscription} from '@domain/entities/Subscription';
import type {BillReminder} from '@domain/entities/BillReminder';
import type {Wallet} from '@domain/entities/Wallet';
import type {ISubscriptionRepository} from '@domain/repositories/ISubscriptionRepository';
import type {IBillReminderRepository} from '@domain/repositories/IBillReminderRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {createBillReminder} from '@domain/entities/BillReminder';
import {advanceNextDueDate} from '@shared/utils/advance-next-due-date';

export type RecurringSchedulerDeps = {
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  subscriptions: ISubscriptionRepository;
  billReminders: IBillReminderRepository;
  wallets: IWalletRepository;
  now: () => number;
  generateId: () => string;
};

function pickDefaultWallet(wallets: Wallet[]): Wallet | null {
  const active = wallets.filter((w) => w.isActive);
  if (active.length === 0) {
    return null;
  }
  return [...active].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.createdAt - b.createdAt;
  })[0];
}

function buildExpenseInput(
  params: {
    walletId: string;
    categoryId: string;
    amount: number;
    currency: string;
    merchant: string;
    description: string;
    transactionDate: number;
    nowMs: number;
    id: string;
  },
): CreateTransactionInput {
  return {
    id: params.id,
    walletId: params.walletId,
    categoryId: params.categoryId,
    amount: params.amount,
    currency: params.currency.toUpperCase(),
    type: 'expense',
    description: params.description,
    merchant: params.merchant,
    source: 'manual',
    sourceHash: '',
    transactionDate: params.transactionDate,
    createdAt: params.nowMs,
    updatedAt: params.nowMs,
  };
}

async function processDueSubscriptions(
  deps: RecurringSchedulerDeps,
  walletId: string,
  nowMs: number,
): Promise<void> {
  const subs = await deps.subscriptions.findActive();
  for (const sub of subs) {
    if (sub.cancelledAt !== null && sub.cancelledAt !== undefined) {
      continue;
    }
    let current = sub;
    while (current.nextDueDate <= nowMs) {
      const txId = deps.generateId();
      await deps.createTransaction(
        buildExpenseInput({
          id: txId,
          walletId,
          categoryId: current.categoryId,
          amount: current.amount,
          currency: current.currency,
          merchant: current.name,
          description: 'Subscription charge',
          transactionDate: current.nextDueDate,
          nowMs,
        }),
      );
      const nextDue = advanceNextDueDate(current.nextDueDate, current.billingCycle);
      const updated: Subscription = {
        ...current,
        nextDueDate: nextDue,
        updatedAt: nowMs,
      };
      await deps.subscriptions.update(updated);
      current = updated;
    }
  }
}

function billRecurrenceToCycle(
  recurrence: BillReminder['recurrence'],
): 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  if (recurrence === 'once') {
    throw new Error('Expected recurring bill');
  }
  return recurrence;
}

async function processDueBills(deps: RecurringSchedulerDeps, defaultWalletId: string, nowMs: number): Promise<void> {
  const bills = await deps.billReminders.findUnpaid();
  for (const bill of bills) {
    if (bill.dueDate > nowMs) {
      continue;
    }
    const effectiveWalletId = bill.walletId || defaultWalletId;
    const txId = deps.generateId();
    await deps.createTransaction(
      buildExpenseInput({
        id: txId,
        walletId: effectiveWalletId,
        categoryId: bill.categoryId,
        amount: bill.amount,
        currency: bill.currency,
        merchant: bill.name,
        description: 'Bill payment',
        transactionDate: bill.dueDate,
        nowMs,
      }),
    );
    await deps.billReminders.markPaid(bill.id, txId);

    if (bill.recurrence !== 'once') {
      const cycle = billRecurrenceToCycle(bill.recurrence);
      const nextDue = advanceNextDueDate(bill.dueDate, cycle);
      const nextBill = createBillReminder({
        id: deps.generateId(),
        name: bill.name,
        amount: bill.amount,
        currency: bill.currency,
        dueDate: nextDue,
        recurrence: bill.recurrence,
        categoryId: bill.categoryId,
        walletId: effectiveWalletId,
        isPaid: false,
        remindDaysBefore: bill.remindDaysBefore,
        createdAt: nowMs,
        updatedAt: nowMs,
      });
      await deps.billReminders.save(nextBill);
    }
  }
}

export async function processRecurringItemsWithDeps(deps: RecurringSchedulerDeps): Promise<void> {
  const wallets = await deps.wallets.findActive();
  const defaultWallet = pickDefaultWallet(wallets);
  if (!defaultWallet) {
    return;
  }
  const nowMs = deps.now();
  await processDueSubscriptions(deps, defaultWallet.id, nowMs);
  await processDueBills(deps, defaultWallet.id, nowMs);
}
