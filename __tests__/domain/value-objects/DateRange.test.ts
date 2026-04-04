import {
  createDateRange,
  isWithinRange,
  getDurationDays,
  getWeekRange,
  getMonthRange,
  overlaps,
} from '@domain/value-objects/DateRange';

describe('DateRange value object', () => {
  const jan1 = new Date(2026, 0, 1).getTime();
  const jan15 = new Date(2026, 0, 15).getTime();
  const jan31 = new Date(2026, 0, 31).getTime();
  const feb1 = new Date(2026, 1, 1).getTime();
  const feb28 = new Date(2026, 1, 28).getTime();

  describe('createDateRange', () => {
    it('should create a valid range', () => {
      const range = createDateRange(jan1, jan31);
      expect(range.startMs).toBe(jan1);
      expect(range.endMs).toBe(jan31);
    });

    it('should throw when start is after end', () => {
      expect(() => createDateRange(jan31, jan1)).toThrow('Start date must be before end date');
    });

    it('should allow equal start and end (single day)', () => {
      const range = createDateRange(jan1, jan1);
      expect(range.startMs).toBe(jan1);
    });
  });

  describe('isWithinRange', () => {
    it('should return true for dates inside range', () => {
      const range = createDateRange(jan1, jan31);
      expect(isWithinRange(range, jan15)).toBe(true);
    });

    it('should return true for boundary dates (inclusive)', () => {
      const range = createDateRange(jan1, jan31);
      expect(isWithinRange(range, jan1)).toBe(true);
      expect(isWithinRange(range, jan31)).toBe(true);
    });

    it('should return false for dates outside range', () => {
      const range = createDateRange(jan1, jan31);
      expect(isWithinRange(range, feb1)).toBe(false);
    });
  });

  describe('getDurationDays', () => {
    it('should calculate duration in days', () => {
      const range = createDateRange(jan1, jan31);
      expect(getDurationDays(range)).toBe(30);
    });

    it('should return 0 for same-day range', () => {
      const range = createDateRange(jan1, jan1);
      expect(getDurationDays(range)).toBe(0);
    });
  });

  describe('getWeekRange', () => {
    it('should return a 7-day range ending on the given date', () => {
      const range = getWeekRange(jan15);
      const days = getDurationDays(range);
      expect(days).toBeGreaterThanOrEqual(6);
      expect(days).toBeLessThanOrEqual(7);
      expect(isWithinRange(range, jan15)).toBe(true);
    });
  });

  describe('getMonthRange', () => {
    it('should return range for January 2026', () => {
      const range = getMonthRange(2026, 0);
      expect(range.startMs).toBe(new Date(2026, 0, 1).getTime());
      expect(range.endMs).toBe(new Date(2026, 0, 31, 23, 59, 59, 999).getTime());
    });

    it('should return range for February 2026', () => {
      const range = getMonthRange(2026, 1);
      expect(range.startMs).toBe(new Date(2026, 1, 1).getTime());
      expect(range.endMs).toBe(new Date(2026, 1, 28, 23, 59, 59, 999).getTime());
    });
  });

  describe('overlaps', () => {
    it('should detect overlapping ranges', () => {
      const a = createDateRange(jan1, jan31);
      const b = createDateRange(jan15, feb28);
      expect(overlaps(a, b)).toBe(true);
    });

    it('should detect non-overlapping ranges', () => {
      const a = createDateRange(jan1, jan31);
      const b = createDateRange(feb1, feb28);
      expect(overlaps(a, b)).toBe(false);
    });
  });
});
