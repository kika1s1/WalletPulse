import {
  formatAmount,
  formatCompactAmount,
  centsToMajor,
  majorToCents,
} from '@shared/utils/format-currency';

describe('format-currency', () => {
  describe('formatAmount', () => {
    it('formats known currencies with symbol via Currency value object', () => {
      expect(formatAmount(150000, 'USD')).toBe('$1,500.00');
      expect(formatAmount(250000, 'ETB')).toBe('Br2,500.00');
    });

    it('formats negative amounts for known currencies', () => {
      expect(formatAmount(-25050, 'USD')).toBe('-$250.50');
    });

    it('falls back to code and major amount for unknown currencies', () => {
      expect(formatAmount(1050, 'XYZ')).toBe('XYZ 10.50');
      expect(formatAmount(-100, 'ZZZ')).toBe('-ZZZ 1.00');
    });
  });

  describe('formatCompactAmount', () => {
    it('uses K suffix from 100000 cents upward', () => {
      expect(formatCompactAmount(100000)).toBe('1.0K');
    });

    it('uses M suffix from 100000000 cents upward', () => {
      expect(formatCompactAmount(100000000)).toBe('1.0M');
    });

    it('formats smaller values as major units with two decimals', () => {
      expect(formatCompactAmount(99999)).toBe('999.99');
      expect(formatCompactAmount(100)).toBe('1.00');
    });

    it('preserves sign for negative amounts', () => {
      expect(formatCompactAmount(-100000)).toBe('-1.0K');
    });
  });

  describe('centsToMajor', () => {
    it('divides cents by 100', () => {
      expect(centsToMajor(2500)).toBe(25);
      expect(centsToMajor(0)).toBe(0);
      expect(centsToMajor(-150)).toBe(-1.5);
    });
  });

  describe('majorToCents', () => {
    it('multiplies by 100 and rounds to integer cents', () => {
      expect(majorToCents(25)).toBe(2500);
      expect(majorToCents(12.345)).toBe(1235);
      expect(majorToCents(0)).toBe(0);
    });
  });
});
