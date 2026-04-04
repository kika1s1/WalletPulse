import {createGoal, getProgress, getRemainingAmount, isOverdue, type CreateGoalInput} from '@domain/entities/Goal';

const baseInput: CreateGoalInput = {
  id: 'g1',
  name: 'Emergency fund',
  targetAmount: 100_000,
  currentAmount: 25_000,
  currency: 'USD',
  deadline: 1_800_000_000_000,
  icon: 'shield',
  color: '#00aa00',
  category: 'emergency',
  isCompleted: false,
  createdAt: 1,
  updatedAt: 2,
};

describe('Goal entity', () => {
  describe('createGoal', () => {
    it('creates a valid goal', () => {
      const g = createGoal(baseInput);
      expect(g.name).toBe('Emergency fund');
      expect(g.targetAmount).toBe(100_000);
      expect(g.currentAmount).toBe(25_000);
      expect(g.currency).toBe('USD');
      expect(g.category).toBe('emergency');
      expect(g.isCompleted).toBe(false);
    });

    it('normalizes currency to uppercase', () => {
      const g = createGoal({...baseInput, currency: 'etb'});
      expect(g.currency).toBe('ETB');
    });

    it('trims goal name', () => {
      const g = createGoal({...baseInput, name: '  Vacation  '});
      expect(g.name).toBe('Vacation');
    });

    it('preserves optional completedAt', () => {
      const g = createGoal({...baseInput, isCompleted: true, completedAt: 99});
      expect(g.isCompleted).toBe(true);
      expect(g.completedAt).toBe(99);
    });

    it('rejects empty name', () => {
      expect(() => createGoal({...baseInput, name: ''})).toThrow('Goal name is required');
    });

    it('rejects zero target amount', () => {
      expect(() => createGoal({...baseInput, targetAmount: 0})).toThrow(
        'Target amount must be positive (cents)',
      );
    });

    it('rejects negative target amount', () => {
      expect(() => createGoal({...baseInput, targetAmount: -1})).toThrow(
        'Target amount must be positive (cents)',
      );
    });

    it('rejects invalid goal category at runtime', () => {
      expect(() =>
        createGoal({...baseInput, category: 'retirement' as CreateGoalInput['category']}),
      ).toThrow('Invalid goal category');
    });

    it('rejects invalid currency', () => {
      expect(() => createGoal({...baseInput, currency: 'US'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
    });
  });

  describe('getProgress', () => {
    it('returns partial progress between 0 and 1', () => {
      expect(getProgress(createGoal(baseInput))).toBeCloseTo(0.25);
    });

    it('returns 1 when current meets or exceeds target', () => {
      expect(
        getProgress(createGoal({...baseInput, currentAmount: 100_000})),
      ).toBe(1);
      expect(
        getProgress(createGoal({...baseInput, currentAmount: 150_000})),
      ).toBe(1);
    });

    it('returns 0 when current is zero or negative relative to target', () => {
      expect(getProgress(createGoal({...baseInput, currentAmount: 0}))).toBe(0);
      expect(getProgress(createGoal({...baseInput, currentAmount: -50}))).toBe(0);
    });
  });

  describe('isOverdue', () => {
    it('returns true when deadline passed and goal not completed', () => {
      const g = createGoal({...baseInput, deadline: 1000});
      expect(isOverdue(g, 1001)).toBe(true);
    });

    it('returns false when completed even if deadline passed', () => {
      const g = createGoal({...baseInput, deadline: 1000, isCompleted: true});
      expect(isOverdue(g, 5000)).toBe(false);
    });

    it('returns false when deadline is in the future', () => {
      const g = createGoal({...baseInput, deadline: 10_000});
      expect(isOverdue(g, 9999)).toBe(false);
    });
  });

  describe('getRemainingAmount', () => {
    it('returns difference between target and current in cents', () => {
      const g = createGoal(baseInput);
      expect(getRemainingAmount(g)).toBe(75_000);
    });

    it('returns negative value when current exceeds target', () => {
      const g = createGoal({...baseInput, currentAmount: 120_000});
      expect(getRemainingAmount(g)).toBe(-20_000);
    });
  });
});
