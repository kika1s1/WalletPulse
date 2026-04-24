export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export type RecurringScheduleType = 'income' | 'expense';

export type RecurringSchedule = {
  readonly id: string;
  readonly templateTransactionId: string;
  readonly walletId: string;
  readonly categoryId: string;
  readonly type: RecurringScheduleType;
  readonly amount: number;
  readonly currency: string;
  readonly merchant: string;
  readonly description: string;
  readonly tags: string[];
  readonly cadence: Cadence;
  readonly nextDueDate: number;
  readonly isActive: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
};

const VALID_CADENCES: ReadonlySet<string> = new Set([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);

const VALID_TYPES: ReadonlySet<string> = new Set(['income', 'expense']);

export type CreateRecurringScheduleInput = RecurringSchedule;

export function createRecurringSchedule(input: CreateRecurringScheduleInput): RecurringSchedule {
  if (!input.id.trim()) {
    throw new Error('id is required');
  }
  if (!input.templateTransactionId.trim()) {
    throw new Error('templateTransactionId is required');
  }
  if (!input.walletId.trim()) {
    throw new Error('walletId is required');
  }
  if (!input.categoryId.trim()) {
    throw new Error('categoryId is required');
  }
  if (!VALID_TYPES.has(input.type)) {
    throw new Error('Invalid recurring schedule type');
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be positive (cents)');
  }
  if (input.currency.length !== 3 || !/^[A-Z]{3}$/.test(input.currency)) {
    throw new Error('Currency must be a 3-letter uppercase ISO code');
  }
  if (!VALID_CADENCES.has(input.cadence)) {
    throw new Error('Invalid cadence');
  }
  if (input.nextDueDate <= 0) {
    throw new Error('nextDueDate must be a positive timestamp');
  }
  return {
    ...input,
    tags: [...input.tags],
  };
}

const RECURRENCE_RULE_TO_CADENCE: Record<string, Cadence> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

export function recurrenceRuleToCadence(rule: string): Cadence | null {
  const cad = RECURRENCE_RULE_TO_CADENCE[rule.toUpperCase()];
  return cad ?? null;
}
