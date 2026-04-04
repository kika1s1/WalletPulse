import type {BillingCycle, Subscription} from '@domain/entities/Subscription';

export type SubscriptionRaw = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextDueDate: number;
  categoryId: string;
  isActive: boolean;
  cancelledAt: number | null;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

function nullToUndefined(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

export function toDomain(raw: SubscriptionRaw): Subscription {
  return {
    id: raw.id,
    name: raw.name,
    amount: raw.amount,
    currency: raw.currency,
    billingCycle: raw.billingCycle as BillingCycle,
    nextDueDate: raw.nextDueDate,
    categoryId: raw.categoryId,
    isActive: raw.isActive,
    cancelledAt: nullToUndefined(raw.cancelledAt),
    icon: raw.icon,
    color: raw.color,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Subscription): Omit<SubscriptionRaw, 'id'> {
  return {
    name: entity.name,
    amount: entity.amount,
    currency: entity.currency,
    billingCycle: entity.billingCycle,
    nextDueDate: entity.nextDueDate,
    categoryId: entity.categoryId,
    isActive: entity.isActive,
    cancelledAt: undefinedToNull(entity.cancelledAt),
    icon: entity.icon,
    color: entity.color,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
