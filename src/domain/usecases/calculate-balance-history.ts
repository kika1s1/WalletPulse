import {transactionLedgerDeltaCents} from '@domain/value-objects/WalletTransferNotes';
import type {TransactionType} from '@domain/entities/Transaction';

export type BalanceHistoryTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  notes: string;
  transactionDate: number;
  currency: string;
};

export type BalanceHistoryPoint = {
  dateMs: number;
  dateLabel: string;
  balance: number;
};

type RateMap = Record<string, number>;

function startOfDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: RateMap,
): number {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) {
    return amount;
  }
  const rate = rates[currency.toUpperCase()];
  if (!rate) {
    return amount;
  }
  return Math.round(amount * rate);
}

export type BalanceHistoryOptions = {
  /** Extend the timeline forward to this date (carry last balance to today). */
  periodEndMs?: number;
  /**
   * Trim the visible timeline to start at this day. Transactions with
   * `transactionDate < periodStartMs` are excluded from the daily deltas; use
   * `openingBalanceCents` to seed the running balance with their net effect.
   */
  periodStartMs?: number;
  /**
   * Seed value for the running balance on `periodStartMs` (before that day's
   * deltas are applied). Typically the caller computes this as the net delta
   * of all transactions strictly before `periodStartMs`.
   */
  openingBalanceCents?: number;
};

/**
 * Replays transactions chronologically to produce a daily running balance.
 * Each point represents the end-of-day balance, with gaps filled by carrying
 * the previous balance forward.
 *
 * When `periodStartMs` + `openingBalanceCents` are provided the timeline is
 * trimmed to that window and starts from the seeded balance, so the curve
 * correctly reflects the real balance at the start of the selected period
 * instead of resetting to zero.
 *
 * When `periodEndMs` is provided the timeline extends to that date so the
 * latest known balance is carried forward (e.g. to "today").
 */
export function computeBalanceHistory(
  transactions: BalanceHistoryTransaction[],
  baseCurrency: string,
  rates: RateMap,
  options?: BalanceHistoryOptions,
): BalanceHistoryPoint[] {
  const periodStart = options?.periodStartMs !== undefined
    ? startOfDayMs(options.periodStartMs)
    : null;
  const openingBalance = options?.openingBalanceCents ?? 0;

  const inWindow = periodStart !== null
    ? transactions.filter((t) => t.transactionDate >= periodStart)
    : transactions;

  if (inWindow.length === 0 && options?.periodEndMs === undefined && periodStart === null) {
    return [];
  }

  const sorted = [...inWindow].sort(
    (a, b) => a.transactionDate - b.transactionDate,
  );

  const dayDeltas = new Map<number, number>();

  for (const t of sorted) {
    const dayKey = startOfDayMs(t.transactionDate);
    const delta = transactionLedgerDeltaCents({
      type: t.type,
      amount: convertToBase(t.amount, t.currency, baseCurrency, rates),
      notes: t.notes,
    });
    dayDeltas.set(dayKey, (dayDeltas.get(dayKey) ?? 0) + delta);
  }

  const firstTxDay = sorted.length > 0 ? startOfDayMs(sorted[0].transactionDate) : null;
  const lastTxDay = sorted.length > 0 ? startOfDayMs(sorted[sorted.length - 1].transactionDate) : null;

  let rangeStart: number;
  if (periodStart !== null) {
    rangeStart = periodStart;
  } else if (firstTxDay !== null) {
    rangeStart = firstTxDay;
  } else if (options?.periodEndMs !== undefined) {
    rangeStart = startOfDayMs(options.periodEndMs);
  } else {
    return [];
  }

  let rangeEnd: number;
  if (options?.periodEndMs !== undefined) {
    rangeEnd = Math.max(startOfDayMs(options.periodEndMs), lastTxDay ?? rangeStart);
  } else if (lastTxDay !== null) {
    rangeEnd = lastTxDay;
  } else {
    rangeEnd = rangeStart;
  }

  if (rangeEnd < rangeStart) {
    rangeEnd = rangeStart;
  }

  const points: BalanceHistoryPoint[] = [];
  let runningBalance = openingBalance;
  const cursor = new Date(rangeStart);

  while (cursor.getTime() <= rangeEnd) {
    const dayMs = cursor.getTime();
    const delta = dayDeltas.get(dayMs) ?? 0;
    runningBalance += delta;

    points.push({
      dateMs: dayMs,
      dateLabel: formatDateLabel(dayMs),
      balance: runningBalance,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}
