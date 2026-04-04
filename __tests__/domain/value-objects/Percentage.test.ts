import {
  createPercentage,
  calculatePercentage,
  formatPercentage,
  calculateChange,
} from '@domain/value-objects/Percentage';

describe('Percentage value object', () => {
  describe('createPercentage', () => {
    it('should create a valid percentage', () => {
      const p = createPercentage(75.5);
      expect(p.value).toBe(75.5);
    });

    it('should allow zero', () => {
      const p = createPercentage(0);
      expect(p.value).toBe(0);
    });

    it('should allow values over 100', () => {
      const p = createPercentage(150);
      expect(p.value).toBe(150);
    });

    it('should allow negative values (for percentage changes)', () => {
      const p = createPercentage(-20);
      expect(p.value).toBe(-20);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate part as percentage of whole', () => {
      const p = calculatePercentage(25, 100);
      expect(p.value).toBe(25);
    });

    it('should handle decimal results', () => {
      const p = calculatePercentage(1, 3);
      expect(p.value).toBeCloseTo(33.33, 1);
    });

    it('should return 0 when whole is 0', () => {
      const p = calculatePercentage(50, 0);
      expect(p.value).toBe(0);
    });

    it('should handle over-100% cases', () => {
      const p = calculatePercentage(150, 100);
      expect(p.value).toBe(150);
    });
  });

  describe('formatPercentage', () => {
    it('should format with one decimal place by default', () => {
      expect(formatPercentage(createPercentage(75.567))).toBe('75.6%');
    });

    it('should format with specified decimal places', () => {
      expect(formatPercentage(createPercentage(75.567), 0)).toBe('76%');
      expect(formatPercentage(createPercentage(75.567), 2)).toBe('75.57%');
    });

    it('should format negative percentages', () => {
      expect(formatPercentage(createPercentage(-12.3))).toBe('-12.3%');
    });
  });

  describe('calculateChange', () => {
    it('should calculate positive change', () => {
      const change = calculateChange(80, 100);
      expect(change.value).toBe(25);
    });

    it('should calculate negative change', () => {
      const change = calculateChange(100, 80);
      expect(change.value).toBe(-20);
    });

    it('should return 0 change when values are equal', () => {
      const change = calculateChange(100, 100);
      expect(change.value).toBe(0);
    });

    it('should return 0 when previous is 0', () => {
      const change = calculateChange(0, 100);
      expect(change.value).toBe(0);
    });
  });
});
