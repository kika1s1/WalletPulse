const MS_PER_DAY = 86400000;

export function toDateString(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

export function startOfDay(timestampMs: number): number {
  const d = new Date(timestampMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(timestampMs: number): number {
  const d = new Date(timestampMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function daysAgo(days: number, fromMs: number = Date.now()): number {
  return fromMs - days * MS_PER_DAY;
}

export function daysFromNow(days: number, fromMs: number = Date.now()): number {
  return fromMs + days * MS_PER_DAY;
}

export function daysBetween(startMs: number, endMs: number): number {
  return Math.round(Math.abs(endMs - startMs) / MS_PER_DAY);
}

export function isSameDay(a: number, b: number): boolean {
  return toDateString(a) === toDateString(b);
}

export function isToday(timestampMs: number): boolean {
  return isSameDay(timestampMs, Date.now());
}

export function formatRelativeDate(timestampMs: number, nowMs: number = Date.now()): string {
  const days = daysBetween(timestampMs, nowMs);
  if (days === 0) {
    return 'Today';
  }
  if (days === 1 && timestampMs < nowMs) {
    return 'Yesterday';
  }
  if (days === 1 && timestampMs > nowMs) {
    return 'Tomorrow';
  }
  if (days < 7 && timestampMs < nowMs) {
    return `${days} days ago`;
  }
  if (days < 7 && timestampMs > nowMs) {
    return `In ${days} days`;
  }
  return toDateString(timestampMs);
}

export type DateFormatPreference = 'US' | 'EU' | 'ISO';

export function formatDateWithPreference(
  timestampMs: number,
  format: DateFormatPreference = 'US',
): string {
  const d = new Date(timestampMs);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'EU':
      return `${day}/${month}/${year}`;
    case 'ISO':
      return `${year}-${month}-${day}`;
    case 'US':
    default:
      return `${month}/${day}/${year}`;
  }
}

export function formatDateLong(
  timestampMs: number,
  format: DateFormatPreference = 'US',
): string {
  const d = new Date(timestampMs);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  switch (format) {
    case 'EU':
      return `${day} ${month} ${year}`;
    case 'ISO':
      return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'US':
    default:
      return `${month} ${day}, ${year}`;
  }
}

export function getWeekDayLabels(
  firstDay: 'monday' | 'sunday' = 'sunday',
): string[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (firstDay === 'monday') {
    return [...labels.slice(1), labels[0]];
  }
  return labels;
}
