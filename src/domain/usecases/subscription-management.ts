import type {Subscription, BillingCycle} from '@domain/entities/Subscription';
import {getYearlyCost} from '@domain/entities/Subscription';

const MS_PER_DAY = 86400000;

const MONTHLY_MULTIPLIERS: Record<BillingCycle, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export type SubscriptionGroups = {
  active: Subscription[];
  cancelled: Subscription[];
};

export function groupSubscriptionsByStatus(subs: Subscription[]): SubscriptionGroups {
  const active: Subscription[] = [];
  const cancelled: Subscription[] = [];

  for (const s of subs) {
    if (s.isActive) {
      active.push(s);
    } else {
      cancelled.push(s);
    }
  }

  return {active, cancelled};
}

export function calculateTotalMonthlyCost(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + s.amount * MONTHLY_MULTIPLIERS[s.billingCycle], 0);
}

export function calculateTotalYearlyCost(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + getYearlyCost(s), 0);
}

export function getUpcomingRenewals(
  subs: Subscription[],
  nowMs: number,
  daysAhead: number,
): Subscription[] {
  const cutoff = nowMs + daysAhead * MS_PER_DAY;
  return subs
    .filter((s) => s.isActive && s.nextDueDate >= nowMs && s.nextDueDate <= cutoff)
    .sort((a, b) => a.nextDueDate - b.nextDueDate);
}

export function sortSubscriptionsByNextDue(subs: Subscription[]): Subscription[] {
  return [...subs].sort((a, b) => a.nextDueDate - b.nextDueDate);
}

export type CategoryCostBreakdown = {
  categoryId: string;
  monthlyTotal: number;
  count: number;
};

export function getCostBreakdownByCategory(subs: Subscription[]): CategoryCostBreakdown[] {
  const activeSubs = subs.filter((s) => s.isActive);
  const map = new Map<string, {total: number; count: number}>();

  for (const s of activeSubs) {
    const monthly = s.amount * MONTHLY_MULTIPLIERS[s.billingCycle];
    const existing = map.get(s.categoryId);
    if (existing) {
      existing.total += monthly;
      existing.count += 1;
    } else {
      map.set(s.categoryId, {total: monthly, count: 1});
    }
  }

  return Array.from(map.entries())
    .map(([categoryId, {total, count}]) => ({
      categoryId,
      monthlyTotal: Math.round(total),
      count,
    }))
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}
