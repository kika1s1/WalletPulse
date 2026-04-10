import type {Subscription} from '@domain/entities/Subscription';
import {
  computeSubscriptionNotifications,
  type SubscriptionNotificationPayload,
} from '@infrastructure/notification/subscription-notifications';

const MS_PER_DAY = 86_400_000;

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    name: 'Netflix',
    amount: 1599,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: Date.now() + 3 * MS_PER_DAY,
    categoryId: 'cat-1',
    isActive: true,
    icon: 'play-circle',
    color: '#E50914',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('computeSubscriptionNotifications', () => {
  const NOW = Date.now();

  it('returns notification for active subscription due within reminder window', () => {
    const sub = makeSubscription({
      nextDueDate: NOW + 2 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result).toHaveLength(1);
    expect(result[0].subscriptionId).toBe('sub-1');
    expect(result[0].subscriptionName).toBe('Netflix');
  });

  it('skips inactive/cancelled subscriptions', () => {
    const sub = makeSubscription({
      isActive: false,
      cancelledAt: NOW - MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result).toHaveLength(0);
  });

  it('skips subscriptions outside reminder window', () => {
    const sub = makeSubscription({
      nextDueDate: NOW + 10 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result).toHaveLength(0);
  });

  it('skips past-due subscriptions', () => {
    const sub = makeSubscription({
      nextDueDate: NOW - MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result).toHaveLength(0);
  });

  it('includes amount formatted correctly', () => {
    const sub = makeSubscription({
      amount: 1599,
      currency: 'USD',
      nextDueDate: NOW + 1 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result[0].amount).toContain('15.99');
  });

  it('computes trigger time as 1 day before due date', () => {
    const dueDate = NOW + 3 * MS_PER_DAY;
    const sub = makeSubscription({nextDueDate: dueDate});

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result[0].triggerMs).toBe(dueDate - MS_PER_DAY);
  });

  it('handles multiple subscriptions', () => {
    const subs = [
      makeSubscription({id: 'sub-1', name: 'Netflix', nextDueDate: NOW + 2 * MS_PER_DAY}),
      makeSubscription({id: 'sub-2', name: 'Spotify', nextDueDate: NOW + 1 * MS_PER_DAY}),
      makeSubscription({id: 'sub-3', name: 'Future', nextDueDate: NOW + 10 * MS_PER_DAY}),
    ];

    const result = computeSubscriptionNotifications(subs, NOW, 3);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.subscriptionName)).toEqual(['Netflix', 'Spotify']);
  });

  it('formats due label correctly for tomorrow', () => {
    const sub = makeSubscription({
      nextDueDate: NOW + 1 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result[0].dueLabel).toBe('renews tomorrow');
  });

  it('formats due label correctly for today', () => {
    const sub = makeSubscription({
      nextDueDate: NOW + 0.1 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result[0].dueLabel).toBe('renews today');
  });

  it('formats due label correctly for multiple days', () => {
    const sub = makeSubscription({
      nextDueDate: NOW + 2.5 * MS_PER_DAY,
    });

    const result = computeSubscriptionNotifications([sub], NOW, 3);

    expect(result[0].dueLabel).toBe('renews in 3 days');
  });
});
