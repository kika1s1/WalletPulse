export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type Subscription = {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly currency: string;
  readonly billingCycle: BillingCycle;
  readonly nextDueDate: number;
  readonly categoryId: string;
  readonly isActive: boolean;
  readonly cancelledAt?: number;
  readonly icon: string;
  readonly color: string;
  readonly createdAt: number;
  readonly updatedAt: number;
};

const BILLING_CYCLES: ReadonlySet<string> = new Set(['weekly', 'monthly', 'quarterly', 'yearly']);

const MS_PER_DAY = 86_400_000;

export type CreateSubscriptionInput = Omit<Subscription, 'cancelledAt'> & {readonly cancelledAt?: number};

export function createSubscription(input: CreateSubscriptionInput): Subscription {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Name must not be empty');
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be a positive integer (cents)');
  }
  if (!BILLING_CYCLES.has(input.billingCycle)) {
    throw new Error('Invalid billing cycle');
  }
  return {...input, name};
}

export function isCancelled(s: Subscription): boolean {
  return s.cancelledAt !== null && s.cancelledAt !== undefined;
}

export function isDueSoon(s: Subscription, nowMs: number, daysThreshold: number): boolean {
  const windowEnd = nowMs + daysThreshold * MS_PER_DAY;
  return s.nextDueDate >= nowMs && s.nextDueDate <= windowEnd;
}

export function getYearlyCost(s: Subscription): number {
  const multipliers: Record<BillingCycle, number> = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };
  return s.amount * multipliers[s.billingCycle];
}
