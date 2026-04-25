import {buildWeeklyActivity} from '@presentation/hooks/useDashboard';
import type {Transaction} from '@domain/entities/Transaction';
import {startOfDay, daysAgo} from '@shared/utils/date-helpers';

function tx(
  type: 'expense' | 'income',
  amount: number,
  daysBack: number,
  currency = 'USD',
): Transaction {
  const dayMs = daysAgo(daysBack);
  return {
    id: `tx-${type}-${daysBack}-${amount}`,
    walletId: 'w-1',
    type,
    amount,
    currency,
    description: '',
    transactionDate: startOfDay(dayMs) + 60 * 60 * 1000,
    createdAt: 0,
    updatedAt: 0,
    source: 'manual',
    rawNotificationId: null,
    categoryId: null,
    merchant: null,
    notes: null,
    receiptUri: null,
  } as unknown as Transaction;
}

describe('buildWeeklyActivity', () => {
  it('returns 7 days, with both income and expense summed per day', () => {
    const transactions: Transaction[] = [
      tx('expense', 1500, 0),
      tx('income', 5000, 0),
      tx('expense', 200, 3),
      tx('income', 1000, 6),
    ];

    const result = buildWeeklyActivity(transactions, 'USD', {});

    expect(result).toHaveLength(7);

    const today = result[6];
    expect(today.expenseAmount).toBe(1500);
    expect(today.incomeAmount).toBe(5000);
    expect(today.isToday).toBe(true);

    const threeDaysAgo = result[3];
    expect(threeDaysAgo.expenseAmount).toBe(200);
    expect(threeDaysAgo.incomeAmount).toBe(0);

    const sixDaysAgo = result[0];
    expect(sixDaysAgo.expenseAmount).toBe(0);
    expect(sixDaysAgo.incomeAmount).toBe(1000);
  });

  it('returns empty (zero) days when there are no transactions', () => {
    const result = buildWeeklyActivity([], 'USD', {});
    expect(result).toHaveLength(7);
    for (const day of result) {
      expect(day.incomeAmount).toBe(0);
      expect(day.expenseAmount).toBe(0);
    }
  });

  it('only the most recent day is marked isToday', () => {
    const result = buildWeeklyActivity([], 'USD', {});
    const flagged = result.filter((d) => d.isToday);
    expect(flagged).toHaveLength(1);
    expect(result[6].isToday).toBe(true);
  });

  it('uses provided day labels', () => {
    const labels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const result = buildWeeklyActivity([], 'USD', {}, labels);
    for (const day of result) {
      expect(labels).toContain(day.label);
    }
  });

  it('converts non-base currencies via the rate map for both income and expense', () => {
    const transactions: Transaction[] = [
      tx('expense', 1000, 0, 'EUR'),
      tx('income', 2000, 0, 'EUR'),
    ];
    const result = buildWeeklyActivity(transactions, 'USD', {EUR: 1.1});
    const today = result[6];
    expect(today.expenseAmount).toBe(1100);
    expect(today.incomeAmount).toBe(2200);
  });
});
