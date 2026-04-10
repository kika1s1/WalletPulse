import type {BillReminder, BillRecurrence} from '@domain/entities/BillReminder';
import {advanceNextDueDate, type BillingCycleForAdvance} from '@shared/utils/advance-next-due-date';

const MS_PER_DAY = 86400000;

const MONTHLY_MULTIPLIERS: Record<BillRecurrence, number> = {
  once: 1,
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function getUpcomingBills(
  bills: BillReminder[],
  nowMs: number,
  daysAhead: number,
): BillReminder[] {
  const cutoff = nowMs + daysAhead * MS_PER_DAY;
  return bills
    .filter((b) => !b.isPaid && b.dueDate >= nowMs && b.dueDate <= cutoff)
    .sort((a, b) => a.dueDate - b.dueDate);
}

export function getOverdueBills(bills: BillReminder[], nowMs: number): BillReminder[] {
  return bills
    .filter((b) => !b.isPaid && b.dueDate < nowMs)
    .sort((a, b) => a.dueDate - b.dueDate);
}

export function groupBillsByMonth(bills: BillReminder[]): Record<string, BillReminder[]> {
  const groups: Record<string, BillReminder[]> = {};
  for (const bill of bills) {
    const d = new Date(bill.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(bill);
  }
  return groups;
}

export function calculateMonthlyBillTotal(bills: BillReminder[]): number {
  return Math.round(
    bills
      .filter((b) => !b.isPaid)
      .reduce((sum, b) => sum + b.amount * MONTHLY_MULTIPLIERS[b.recurrence], 0),
  );
}

export function getNextDueDate(currentDueDateMs: number, recurrence: BillRecurrence): number {
  if (recurrence === 'once') {
    return currentDueDateMs;
  }
  return advanceNextDueDate(currentDueDateMs, recurrence as BillingCycleForAdvance);
}
