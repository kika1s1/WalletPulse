export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceRule = {
  readonly frequency: RecurrenceFrequency;
  readonly interval: number;
};

const MS_PER_DAY = 86400000;
const MAX_OCCURRENCES = 365;

const RULE_MAP: Record<string, RecurrenceRule> = {
  DAILY: {frequency: 'daily', interval: 1},
  WEEKLY: {frequency: 'weekly', interval: 1},
  BIWEEKLY: {frequency: 'weekly', interval: 2},
  MONTHLY: {frequency: 'monthly', interval: 1},
  QUARTERLY: {frequency: 'monthly', interval: 3},
  YEARLY: {frequency: 'yearly', interval: 1},
};

export function parseRecurrenceRule(rule: string): RecurrenceRule | null {
  const normalized = rule.trim().toUpperCase();
  return RULE_MAP[normalized] ?? null;
}

export function getNextOccurrence(baseMs: number, rule: RecurrenceRule): number {
  const d = new Date(baseMs);

  switch (rule.frequency) {
    case 'daily':
      return baseMs + rule.interval * MS_PER_DAY;

    case 'weekly':
      return baseMs + rule.interval * 7 * MS_PER_DAY;

    case 'monthly': {
      const month = d.getMonth() + rule.interval;
      const next = new Date(d.getFullYear(), month, d.getDate(), d.getHours(), d.getMinutes());
      return next.getTime();
    }

    case 'yearly': {
      const next = new Date(
        d.getFullYear() + rule.interval,
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
      );
      return next.getTime();
    }
  }
}

export function generateOccurrences(
  startMs: number,
  rule: RecurrenceRule,
  endMs: number,
  maxCount: number = MAX_OCCURRENCES,
): number[] {
  if (startMs >= endMs) {
    return [];
  }

  const results: number[] = [];
  let current = getNextOccurrence(startMs, rule);

  while (current <= endMs && results.length < maxCount) {
    results.push(current);
    current = getNextOccurrence(current, rule);
  }

  return results;
}

export function isRecurrenceActive(isRecurring: boolean, ruleStr: string): boolean {
  if (!isRecurring) {
    return false;
  }
  return parseRecurrenceRule(ruleStr) !== null;
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

export function describeRecurrence(rule: RecurrenceRule): string {
  const unit = FREQUENCY_LABELS[rule.frequency];
  if (rule.interval === 1) {
    return `Every ${unit}`;
  }
  return `Every ${rule.interval} ${unit}s`;
}
