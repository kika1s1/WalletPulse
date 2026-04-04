export type DateRange = {
  readonly startMs: number;
  readonly endMs: number;
};

const MS_PER_DAY = 86400000;

export function createDateRange(startMs: number, endMs: number): DateRange {
  if (startMs > endMs) {
    throw new Error('Start date must be before end date');
  }
  return {startMs, endMs};
}

export function isWithinRange(range: DateRange, timestampMs: number): boolean {
  return timestampMs >= range.startMs && timestampMs <= range.endMs;
}

export function getDurationDays(range: DateRange): number {
  return Math.round((range.endMs - range.startMs) / MS_PER_DAY);
}

export function getWeekRange(endDateMs: number): DateRange {
  const endOfDay = new Date(endDateMs);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(endOfDay.getTime() - 6 * MS_PER_DAY);
  startOfWeek.setHours(0, 0, 0, 0);
  return createDateRange(startOfWeek.getTime(), endOfDay.getTime());
}

export function getMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(23, 59, 59, 999);
  return createDateRange(start.getTime(), lastDay.getTime());
}

export function overlaps(a: DateRange, b: DateRange): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}
