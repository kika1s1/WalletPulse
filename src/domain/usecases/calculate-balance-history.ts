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

const MS_PER_DAY = 86_400_000;

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

/**
 * Replays all transactions chronologically to produce a daily running balance.
 * Each point represents the end-of-day balance, with gaps filled by carrying
 * the previous balance forward.
 */
export function computeBalanceHistory(
  transactions: BalanceHistoryTransaction[],
  baseCurrency: string,
  rates: RateMap,
): BalanceHistoryPoint[] {
  if (transactions.length === 0) {
    return [];
  }

  const sorted = [...transactions].sort(
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

  const firstDay = startOfDayMs(sorted[0].transactionDate);
  const lastDay = startOfDayMs(sorted[sorted.length - 1].transactionDate);

  const points: BalanceHistoryPoint[] = [];
  let runningBalance = 0;
  let cursor = firstDay;

  while (cursor <= lastDay) {
    const delta = dayDeltas.get(cursor) ?? 0;
    runningBalance += delta;

    points.push({
      dateMs: cursor,
      dateLabel: formatDateLabel(cursor),
      balance: runningBalance,
    });

    cursor += MS_PER_DAY;
  }

  return points;
}
