export type BillRecurrence = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type BillReminder = {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly currency: string;
  readonly dueDate: number;
  readonly recurrence: BillRecurrence;
  readonly categoryId: string;
  readonly walletId: string;
  readonly isPaid: boolean;
  readonly paidTransactionId?: string;
  readonly remindDaysBefore: number;
  readonly createdAt: number;
  readonly updatedAt: number;
};

const RECURRENCE_VALUES: ReadonlySet<string> = new Set([
  'once',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);

const MS_PER_DAY = 86_400_000;

export type CreateBillReminderInput = Omit<BillReminder, 'paidTransactionId'> & {
  readonly paidTransactionId?: string;
};

export function createBillReminder(input: CreateBillReminderInput): BillReminder {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Name must not be empty');
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be a positive integer (cents)');
  }
  if (!RECURRENCE_VALUES.has(input.recurrence)) {
    throw new Error('Invalid recurrence');
  }
  if (!Number.isInteger(input.remindDaysBefore) || input.remindDaysBefore < 0) {
    throw new Error('remindDaysBefore must be a non-negative integer');
  }
  return {...input, name};
}

export function isOverdue(b: BillReminder, nowMs: number): boolean {
  return !b.isPaid && b.dueDate < nowMs;
}

export function shouldRemind(b: BillReminder, nowMs: number): boolean {
  if (b.isPaid) {
    return false;
  }
  const windowStart = b.dueDate - b.remindDaysBefore * MS_PER_DAY;
  return nowMs >= windowStart && nowMs <= b.dueDate;
}

export function isPaidWithTransaction(b: BillReminder): boolean {
  return b.isPaid && b.paidTransactionId !== null && b.paidTransactionId !== undefined && b.paidTransactionId !== '';
}
