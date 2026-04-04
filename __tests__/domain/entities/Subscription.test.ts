import {
  createSubscription,
  getYearlyCost,
  isCancelled,
  isDueSoon,
} from '@domain/entities/Subscription';

const MS_PER_DAY = 86_400_000;

const baseInput = {
  id: 'sub-1',
  name: 'Streaming',
  amount: 999,
  currency: 'USD',
  billingCycle: 'monthly' as const,
  nextDueDate: 1_700_000_000_000,
  categoryId: 'cat-1',
  isActive: true,
  icon: 'play',
  color: '#112233',
  createdAt: 1,
  updatedAt: 1,
};

describe('Subscription entity', () => {
  describe('createSubscription', () => {
    it('creates a valid monthly subscription', () => {
      const s = createSubscription(baseInput);
      expect(s.name).toBe('Streaming');
      expect(s.billingCycle).toBe('monthly');
      expect(s.amount).toBe(999);
      expect(s.currency).toBe('USD');
    });

    it('rejects an empty name', () => {
      expect(() => createSubscription({...baseInput, name: '   '})).toThrow('Name must not be empty');
    });

    it('rejects zero amount', () => {
      expect(() => createSubscription({...baseInput, amount: 0})).toThrow(
        'Amount must be a positive integer (cents)',
      );
    });
  });

  describe('isCancelled', () => {
    it('returns true when cancelledAt is set', () => {
      const s = createSubscription({...baseInput, cancelledAt: 99});
      expect(isCancelled(s)).toBe(true);
    });

    it('returns false when cancelledAt is not set', () => {
      const s = createSubscription(baseInput);
      expect(isCancelled(s)).toBe(false);
    });
  });

  describe('isDueSoon', () => {
    it('returns true when next due is within the threshold days', () => {
      const now = Date.UTC(2026, 3, 1);
      const s = createSubscription({...baseInput, nextDueDate: now + 3 * MS_PER_DAY});
      expect(isDueSoon(s, now, 7)).toBe(true);
    });

    it('returns false when next due is beyond the threshold', () => {
      const now = Date.UTC(2026, 3, 1);
      const s = createSubscription({...baseInput, nextDueDate: now + 10 * MS_PER_DAY});
      expect(isDueSoon(s, now, 7)).toBe(false);
    });
  });

  describe('getYearlyCost', () => {
    it('multiplies by 52 for weekly billing', () => {
      const s = createSubscription({...baseInput, billingCycle: 'weekly', amount: 100});
      expect(getYearlyCost(s)).toBe(5200);
    });

    it('multiplies by 12 for monthly billing', () => {
      const s = createSubscription({...baseInput, billingCycle: 'monthly', amount: 1000});
      expect(getYearlyCost(s)).toBe(12000);
    });

    it('multiplies by 4 for quarterly billing', () => {
      const s = createSubscription({...baseInput, billingCycle: 'quarterly', amount: 4000});
      expect(getYearlyCost(s)).toBe(16000);
    });

    it('uses multiplier 1 for yearly billing', () => {
      const s = createSubscription({...baseInput, billingCycle: 'yearly', amount: 50000});
      expect(getYearlyCost(s)).toBe(50000);
    });
  });
});
