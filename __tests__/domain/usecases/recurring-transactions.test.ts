import {
  type RecurrenceRule,
  parseRecurrenceRule,
  getNextOccurrence,
  generateOccurrences,
  isRecurrenceActive,
  describeRecurrence,
} from '@domain/usecases/recurring-transactions';

const DAY = 86400000;

describe('recurring-transactions', () => {
  describe('parseRecurrenceRule', () => {
    it('parses DAILY rule', () => {
      const rule = parseRecurrenceRule('DAILY');
      expect(rule).toEqual({frequency: 'daily', interval: 1});
    });

    it('parses WEEKLY rule', () => {
      const rule = parseRecurrenceRule('WEEKLY');
      expect(rule).toEqual({frequency: 'weekly', interval: 1});
    });

    it('parses MONTHLY rule', () => {
      const rule = parseRecurrenceRule('MONTHLY');
      expect(rule).toEqual({frequency: 'monthly', interval: 1});
    });

    it('parses YEARLY rule', () => {
      const rule = parseRecurrenceRule('YEARLY');
      expect(rule).toEqual({frequency: 'yearly', interval: 1});
    });

    it('parses BIWEEKLY as weekly with interval 2', () => {
      const rule = parseRecurrenceRule('BIWEEKLY');
      expect(rule).toEqual({frequency: 'weekly', interval: 2});
    });

    it('returns null for invalid rule', () => {
      expect(parseRecurrenceRule('')).toBeNull();
      expect(parseRecurrenceRule('RANDOM')).toBeNull();
    });

    it('parses case-insensitively', () => {
      expect(parseRecurrenceRule('monthly')).toEqual({frequency: 'monthly', interval: 1});
    });
  });

  describe('getNextOccurrence', () => {
    it('adds correct number of days for daily', () => {
      const baseMs = new Date('2025-01-15').getTime();
      const next = getNextOccurrence(baseMs, {frequency: 'daily', interval: 1});
      const diff = next - baseMs;
      expect(diff).toBe(DAY);
    });

    it('adds 7 days for weekly', () => {
      const baseMs = new Date('2025-01-15').getTime();
      const next = getNextOccurrence(baseMs, {frequency: 'weekly', interval: 1});
      const diff = next - baseMs;
      expect(diff).toBe(7 * DAY);
    });

    it('adds 14 days for biweekly (interval 2)', () => {
      const baseMs = new Date('2025-01-15').getTime();
      const next = getNextOccurrence(baseMs, {frequency: 'weekly', interval: 2});
      const diff = next - baseMs;
      expect(diff).toBe(14 * DAY);
    });

    it('advances month correctly for monthly', () => {
      const baseMs = new Date('2025-01-15').getTime();
      const next = getNextOccurrence(baseMs, {frequency: 'monthly', interval: 1});
      const nextDate = new Date(next);
      expect(nextDate.getMonth()).toBe(1);
      expect(nextDate.getDate()).toBe(15);
    });

    it('advances year correctly for yearly', () => {
      const baseMs = new Date('2025-03-10').getTime();
      const next = getNextOccurrence(baseMs, {frequency: 'yearly', interval: 1});
      const nextDate = new Date(next);
      expect(nextDate.getFullYear()).toBe(2026);
      expect(nextDate.getMonth()).toBe(2);
    });
  });

  describe('generateOccurrences', () => {
    it('generates correct number of monthly occurrences in range', () => {
      const startMs = new Date('2025-01-01').getTime();
      const endMs = new Date('2025-06-30').getTime();
      const rule: RecurrenceRule = {frequency: 'monthly', interval: 1};
      const occurrences = generateOccurrences(startMs, rule, endMs);
      expect(occurrences.length).toBeGreaterThanOrEqual(5);
      expect(occurrences.length).toBeLessThanOrEqual(6);
    });

    it('generates weekly occurrences', () => {
      const startMs = new Date('2025-01-01').getTime();
      const endMs = new Date('2025-01-31').getTime();
      const rule: RecurrenceRule = {frequency: 'weekly', interval: 1};
      const occurrences = generateOccurrences(startMs, rule, endMs);
      expect(occurrences.length).toBeGreaterThanOrEqual(4);
    });

    it('respects maxCount limit', () => {
      const startMs = new Date('2025-01-01').getTime();
      const endMs = new Date('2025-12-31').getTime();
      const rule: RecurrenceRule = {frequency: 'daily', interval: 1};
      const occurrences = generateOccurrences(startMs, rule, endMs, 10);
      expect(occurrences.length).toBe(10);
    });

    it('returns empty array if start is after end', () => {
      const endMs = new Date('2025-01-01').getTime();
      const startMs = new Date('2025-06-01').getTime();
      const rule: RecurrenceRule = {frequency: 'monthly', interval: 1};
      expect(generateOccurrences(startMs, rule, endMs)).toEqual([]);
    });
  });

  describe('isRecurrenceActive', () => {
    it('returns true when rule is valid and transaction is recurring', () => {
      expect(isRecurrenceActive(true, 'MONTHLY')).toBe(true);
    });

    it('returns false when isRecurring is false', () => {
      expect(isRecurrenceActive(false, 'MONTHLY')).toBe(false);
    });

    it('returns false for empty rule', () => {
      expect(isRecurrenceActive(true, '')).toBe(false);
    });
  });

  describe('describeRecurrence', () => {
    it('describes daily', () => {
      expect(describeRecurrence({frequency: 'daily', interval: 1})).toBe('Every day');
    });

    it('describes weekly', () => {
      expect(describeRecurrence({frequency: 'weekly', interval: 1})).toBe('Every week');
    });

    it('describes biweekly', () => {
      expect(describeRecurrence({frequency: 'weekly', interval: 2})).toBe('Every 2 weeks');
    });

    it('describes monthly', () => {
      expect(describeRecurrence({frequency: 'monthly', interval: 1})).toBe('Every month');
    });

    it('describes yearly', () => {
      expect(describeRecurrence({frequency: 'yearly', interval: 1})).toBe('Every year');
    });
  });
});
