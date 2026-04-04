import {createMoney, addMoney, subtractMoney, formatMoney, isPositive, isZero} from '@domain/value-objects/Money';

describe('Money value object', () => {
  describe('createMoney', () => {
    it('should create money with valid cents and currency', () => {
      const money = createMoney(1500, 'USD');
      expect(money.amountInCents).toBe(1500);
      expect(money.currency).toBe('USD');
    });

    it('should uppercase the currency code', () => {
      const money = createMoney(100, 'eur');
      expect(money.currency).toBe('EUR');
    });

    it('should reject non-integer amounts', () => {
      expect(() => createMoney(15.5, 'USD')).toThrow('Amount must be an integer');
    });

    it('should reject invalid currency codes', () => {
      expect(() => createMoney(100, 'US')).toThrow('Currency must be a 3-letter ISO code');
      expect(() => createMoney(100, '')).toThrow('Currency must be a 3-letter ISO code');
    });

    it('should allow negative amounts (for expenses)', () => {
      const money = createMoney(-500, 'ETB');
      expect(money.amountInCents).toBe(-500);
    });
  });

  describe('addMoney', () => {
    it('should add two amounts in the same currency', () => {
      const a = createMoney(1000, 'USD');
      const b = createMoney(500, 'USD');
      const result = addMoney(a, b);
      expect(result.amountInCents).toBe(1500);
      expect(result.currency).toBe('USD');
    });

    it('should throw when adding different currencies', () => {
      const a = createMoney(1000, 'USD');
      const b = createMoney(500, 'EUR');
      expect(() => addMoney(a, b)).toThrow('Cannot add different currencies');
    });
  });

  describe('subtractMoney', () => {
    it('should subtract two amounts in the same currency', () => {
      const a = createMoney(1000, 'ETB');
      const b = createMoney(300, 'ETB');
      const result = subtractMoney(a, b);
      expect(result.amountInCents).toBe(700);
    });
  });

  describe('formatMoney', () => {
    it('should format positive amounts', () => {
      expect(formatMoney(createMoney(1500, 'USD'))).toBe('USD 15.00');
    });

    it('should format negative amounts with a sign', () => {
      expect(formatMoney(createMoney(-250, 'ETB'))).toBe('-ETB 2.50');
    });

    it('should format zero', () => {
      expect(formatMoney(createMoney(0, 'EUR'))).toBe('EUR 0.00');
    });
  });

  describe('predicates', () => {
    it('isPositive should return true for positive amounts', () => {
      expect(isPositive(createMoney(100, 'USD'))).toBe(true);
      expect(isPositive(createMoney(0, 'USD'))).toBe(false);
      expect(isPositive(createMoney(-100, 'USD'))).toBe(false);
    });

    it('isZero should return true only for zero', () => {
      expect(isZero(createMoney(0, 'USD'))).toBe(true);
      expect(isZero(createMoney(1, 'USD'))).toBe(false);
    });
  });
});
