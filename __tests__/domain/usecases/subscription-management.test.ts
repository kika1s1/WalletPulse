import {
  groupSubscriptionsByStatus,
  calculateTotalMonthlyCost,
  calculateTotalYearlyCost,
  getUpcomingRenewals,
  sortSubscriptionsByNextDue,
  getCostBreakdownByCategory,
} from '@domain/usecases/subscription-management';
import type {Subscription} from '@domain/entities/Subscription';

const DAY = 86400000;
const now = Date.now();

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 's1',
    name: 'Netflix',
    amount: 1599,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 10 * DAY,
    categoryId: 'entertainment',
    isActive: true,
    icon: '🎬',
    color: '#E50914',
    createdAt: now - 60 * DAY,
    updatedAt: now,
    ...overrides,
  };
}

describe('subscription-management', () => {
  describe('groupSubscriptionsByStatus', () => {
    it('separates active and cancelled subscriptions', () => {
      const subs = [
        makeSub({id: 'active'}),
        makeSub({id: 'cancelled', isActive: false, cancelledAt: now - DAY}),
      ];
      const groups = groupSubscriptionsByStatus(subs);
      expect(groups.active.length).toBe(1);
      expect(groups.cancelled.length).toBe(1);
    });
  });

  describe('calculateTotalMonthlyCost', () => {
    it('normalizes all cycles to monthly', () => {
      const subs = [
        makeSub({amount: 1200, billingCycle: 'monthly'}),
        makeSub({id: 's2', amount: 10000, billingCycle: 'yearly'}),
      ];
      const total = calculateTotalMonthlyCost(subs);
      expect(total).toBeCloseTo(1200 + 10000 / 12, 0);
    });

    it('only includes active subscriptions', () => {
      const subs = [
        makeSub({amount: 1000}),
        makeSub({id: 's2', amount: 5000, isActive: false, cancelledAt: now}),
      ];
      expect(calculateTotalMonthlyCost(subs)).toBeCloseTo(1000, 0);
    });
  });

  describe('calculateTotalYearlyCost', () => {
    it('sums yearly costs of active subscriptions', () => {
      const subs = [
        makeSub({amount: 1000, billingCycle: 'monthly'}),
        makeSub({id: 's2', amount: 5000, billingCycle: 'yearly'}),
      ];
      const total = calculateTotalYearlyCost(subs);
      expect(total).toBe(1000 * 12 + 5000);
    });
  });

  describe('getUpcomingRenewals', () => {
    it('returns active subscriptions due within window', () => {
      const subs = [
        makeSub({id: 's1', nextDueDate: now + 3 * DAY}),
        makeSub({id: 's2', nextDueDate: now + 20 * DAY}),
        makeSub({id: 's3', nextDueDate: now + 5 * DAY, isActive: false, cancelledAt: now}),
      ];
      const upcoming = getUpcomingRenewals(subs, now, 7);
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].id).toBe('s1');
    });
  });

  describe('sortSubscriptionsByNextDue', () => {
    it('sorts by nearest due date', () => {
      const subs = [
        makeSub({id: 'far', nextDueDate: now + 30 * DAY}),
        makeSub({id: 'near', nextDueDate: now + 5 * DAY}),
      ];
      const sorted = sortSubscriptionsByNextDue(subs);
      expect(sorted[0].id).toBe('near');
    });
  });

  describe('getCostBreakdownByCategory', () => {
    it('groups costs by category', () => {
      const subs = [
        makeSub({categoryId: 'entertainment', amount: 1000, billingCycle: 'monthly'}),
        makeSub({id: 's2', categoryId: 'entertainment', amount: 500, billingCycle: 'monthly'}),
        makeSub({id: 's3', categoryId: 'productivity', amount: 2000, billingCycle: 'monthly'}),
      ];
      const breakdown = getCostBreakdownByCategory(subs);
      expect(breakdown.length).toBe(2);
      const entertainment = breakdown.find((b) => b.categoryId === 'entertainment');
      expect(entertainment?.monthlyTotal).toBe(1500);
    });

    it('sorts by monthly total descending', () => {
      const subs = [
        makeSub({categoryId: 'a', amount: 500, billingCycle: 'monthly'}),
        makeSub({id: 's2', categoryId: 'b', amount: 2000, billingCycle: 'monthly'}),
      ];
      const breakdown = getCostBreakdownByCategory(subs);
      expect(breakdown[0].categoryId).toBe('b');
    });
  });
});
