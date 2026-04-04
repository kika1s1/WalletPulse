import {createBudget, isExpired, isOverallBudget, type CreateBudgetInput} from '@domain/entities/Budget';

const start = 1_704_000_000_000;
const end = start + 86_400_000;

const categoryBudgetInput: CreateBudgetInput = {
  id: 'b1',
  categoryId: 'cat-groceries',
  amount: 50_000,
  currency: 'USD',
  period: 'monthly',
  startDate: start,
  endDate: end,
  rollover: false,
  isActive: true,
  createdAt: 1,
  updatedAt: 2,
};

describe('Budget entity', () => {
  describe('createBudget', () => {
    it('creates a monthly category budget', () => {
      const b = createBudget(categoryBudgetInput);
      expect(b.categoryId).toBe('cat-groceries');
      expect(b.amount).toBe(50_000);
      expect(b.currency).toBe('USD');
      expect(b.period).toBe('monthly');
      expect(b.startDate).toBe(start);
      expect(b.endDate).toBe(end);
      expect(b.rollover).toBe(false);
      expect(b.isActive).toBe(true);
    });

    it('creates an overall budget when categoryId is null', () => {
      const b = createBudget({...categoryBudgetInput, id: 'b2', categoryId: null});
      expect(b.categoryId).toBeNull();
      expect(isOverallBudget(b)).toBe(true);
    });

    it('creates an overall budget when categoryId is omitted', () => {
      const {categoryId: _omit, ...rest} = categoryBudgetInput;
      const b = createBudget({...rest, id: 'b3'});
      expect(b.categoryId).toBeNull();
    });

    it('normalizes currency to uppercase', () => {
      const b = createBudget({...categoryBudgetInput, currency: 'eur'});
      expect(b.currency).toBe('EUR');
    });

    it('accepts weekly period', () => {
      const b = createBudget({...categoryBudgetInput, period: 'weekly'});
      expect(b.period).toBe('weekly');
    });

    it('rejects zero amount', () => {
      expect(() => createBudget({...categoryBudgetInput, amount: 0})).toThrow(
        'Budget amount must be positive (cents)',
      );
    });

    it('rejects negative amount', () => {
      expect(() => createBudget({...categoryBudgetInput, amount: -100})).toThrow(
        'Budget amount must be positive (cents)',
      );
    });

    it('rejects invalid period', () => {
      expect(() =>
        createBudget({...categoryBudgetInput, period: 'daily' as CreateBudgetInput['period']}),
      ).toThrow('Invalid budget period');
    });

    it('rejects end date before or equal to start date', () => {
      expect(() =>
        createBudget({...categoryBudgetInput, startDate: end, endDate: start}),
      ).toThrow('Start date must be before end date');
      expect(() =>
        createBudget({...categoryBudgetInput, startDate: start, endDate: start}),
      ).toThrow('Start date must be before end date');
    });

    it('rejects invalid currency', () => {
      expect(() => createBudget({...categoryBudgetInput, currency: 'US'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
    });
  });

  describe('isOverallBudget', () => {
    it('returns false for a category-scoped budget', () => {
      const b = createBudget(categoryBudgetInput);
      expect(isOverallBudget(b)).toBe(false);
    });

    it('returns true when categoryId is null', () => {
      const b = createBudget({...categoryBudgetInput, categoryId: null});
      expect(isOverallBudget(b)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('returns true when now is after endDate', () => {
      const b = createBudget(categoryBudgetInput);
      expect(isExpired(b, end + 1)).toBe(true);
    });

    it('returns false when now equals or is before endDate', () => {
      const b = createBudget(categoryBudgetInput);
      expect(isExpired(b, end)).toBe(false);
      expect(isExpired(b, end - 1)).toBe(false);
    });
  });
});
