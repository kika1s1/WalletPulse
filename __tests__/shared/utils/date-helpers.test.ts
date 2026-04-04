import {
  toDateString,
  startOfDay,
  endOfDay,
  daysAgo,
  daysFromNow,
  daysBetween,
  isSameDay,
  formatRelativeDate,
} from '@shared/utils/date-helpers';

const MS_PER_DAY = 86400000;

describe('date-helpers', () => {
  describe('toDateString', () => {
    it('formats timestamp as YYYY-MM-DD in UTC', () => {
      const ts = Date.UTC(2024, 5, 10, 15, 30, 0);
      expect(toDateString(ts)).toBe('2024-06-10');
    });

    it('formats midnight UTC correctly', () => {
      const ts = Date.UTC(2023, 0, 1, 0, 0, 0);
      expect(toDateString(ts)).toBe('2023-01-01');
    });
  });

  describe('startOfDay', () => {
    it('zeros local time to 00:00:00.000', () => {
      const ts = new Date(2024, 2, 15, 14, 30, 45, 123).getTime();
      const start = startOfDay(ts);
      const d = new Date(start);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(d.getMilliseconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('sets local time to 23:59:59.999', () => {
      const ts = new Date(2024, 2, 15, 9, 0, 0, 0).getTime();
      const end = endOfDay(ts);
      const d = new Date(end);
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
      expect(d.getSeconds()).toBe(59);
      expect(d.getMilliseconds()).toBe(999);
    });
  });

  describe('daysAgo', () => {
    it('subtracts the given number of days in milliseconds', () => {
      const fromMs = Date.UTC(2024, 6, 20, 12, 0, 0);
      const result = daysAgo(5, fromMs);
      expect(result).toBe(fromMs - 5 * MS_PER_DAY);
    });
  });

  describe('daysFromNow', () => {
    it('adds the given number of days in milliseconds', () => {
      const fromMs = Date.UTC(2024, 1, 1, 0, 0, 0);
      const result = daysFromNow(7, fromMs);
      expect(result).toBe(fromMs + 7 * MS_PER_DAY);
    });
  });

  describe('daysBetween', () => {
    it('returns the number of whole days between two timestamps', () => {
      const startMs = 0;
      const endMs = 3 * MS_PER_DAY;
      expect(daysBetween(startMs, endMs)).toBe(3);
    });

    it('uses absolute difference regardless of order', () => {
      const a = 10 * MS_PER_DAY;
      const b = 4 * MS_PER_DAY;
      expect(daysBetween(a, b)).toBe(6);
      expect(daysBetween(b, a)).toBe(6);
    });
  });

  describe('isSameDay', () => {
    it('returns true for two timestamps on the same UTC calendar day', () => {
      const a = Date.UTC(2024, 3, 5, 8, 0, 0);
      const b = Date.UTC(2024, 3, 5, 22, 59, 59);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('returns false for different UTC calendar days', () => {
      const a = Date.UTC(2024, 3, 5, 23, 0, 0);
      const b = Date.UTC(2024, 3, 6, 1, 0, 0);
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  describe('formatRelativeDate', () => {
    const nowMs = Date.UTC(2024, 8, 15, 12, 0, 0);

    it("returns 'Today' when difference rounds to zero days", () => {
      expect(formatRelativeDate(nowMs, nowMs)).toBe('Today');
    });

    it("returns 'Yesterday' when one day before now", () => {
      const ts = nowMs - MS_PER_DAY;
      expect(formatRelativeDate(ts, nowMs)).toBe('Yesterday');
    });

    it("returns '3 days ago' for three days in the past within a week window", () => {
      const ts = nowMs - 3 * MS_PER_DAY;
      expect(formatRelativeDate(ts, nowMs)).toBe('3 days ago');
    });

    it("returns 'Tomorrow' when one day after now", () => {
      const ts = nowMs + MS_PER_DAY;
      expect(formatRelativeDate(ts, nowMs)).toBe('Tomorrow');
    });

    it("returns 'In X days' for a near future date within a week", () => {
      const ts = nowMs + 2 * MS_PER_DAY;
      expect(formatRelativeDate(ts, nowMs)).toBe('In 2 days');
    });

    it('returns a YYYY-MM-DD date string for dates farther than a week', () => {
      const ts = nowMs - 10 * MS_PER_DAY;
      expect(formatRelativeDate(ts, nowMs)).toBe(toDateString(ts));
    });
  });
});
