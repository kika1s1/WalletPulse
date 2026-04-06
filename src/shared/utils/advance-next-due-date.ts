const MS_PER_WEEK = 7 * 86400000;

export type BillingCycleForAdvance = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

function addCalendarMonths(fromMs: number, monthsToAdd: number): number {
  const d = new Date(fromMs);
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes();
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  const target = new Date(d.getFullYear(), d.getMonth() + monthsToAdd, 1, h, min, s, ms);
  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfMonth));
  return target.getTime();
}

/**
 * Next due instant after `fromMs` for the given billing cycle.
 * Month and year steps use calendar arithmetic with end-of-month clamping (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function advanceNextDueDate(fromMs: number, cycle: BillingCycleForAdvance): number {
  switch (cycle) {
    case 'weekly':
      return fromMs + MS_PER_WEEK;
    case 'monthly':
      return addCalendarMonths(fromMs, 1);
    case 'quarterly':
      return addCalendarMonths(fromMs, 3);
    case 'yearly':
      return addCalendarMonths(fromMs, 12);
  }
}
