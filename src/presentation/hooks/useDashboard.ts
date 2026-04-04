import {useMemo, useCallback} from 'react';
import {useTransactions} from './useTransactions';
import {useWallets} from './useWallets';
import {useAppStore} from '@presentation/stores/useAppStore';
import {startOfDay, endOfDay, daysAgo} from '@shared/utils/date-helpers';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {DaySpending} from '@presentation/components/charts/MiniBarChart';
import type {InsightCardProps} from '@presentation/components/InsightCard';

export type DashboardData = {
  totalBalance: number;
  baseCurrency: string;
  percentChange: number;
  monthIncome: number;
  monthExpenses: number;
  weeklySpending: DaySpending[];
  recentTransactions: Transaction[];
  insights: InsightCardProps[];
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthRange(): {startMs: number; endMs: number} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(Date.now()),
  };
}

function getPrevMonthRange(): {startMs: number; endMs: number} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(end.getTime()),
  };
}

function buildWeeklySpending(transactions: Transaction[]): DaySpending[] {
  const now = Date.now();
  const todayDow = new Date(now).getDay();
  const result: DaySpending[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayMs = daysAgo(i, now);
    const dayStart = startOfDay(dayMs);
    const dayEnd = endOfDay(dayMs);
    const dow = new Date(dayMs).getDay();

    const dayTotal = transactions
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.transactionDate >= dayStart &&
          t.transactionDate <= dayEnd,
      )
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({
      label: DAY_LABELS[dow],
      amount: dayTotal,
      isToday: dow === todayDow && i === 0,
    });
  }

  return result;
}

function sumByType(
  transactions: Transaction[],
  type: 'income' | 'expense',
  range: {startMs: number; endMs: number},
): number {
  return transactions
    .filter(
      (t) =>
        t.type === type &&
        t.transactionDate >= range.startMs &&
        t.transactionDate <= range.endMs,
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

function computePercentChange(current: number, previous: number): number {
  if (previous === 0 && current === 0) {
    return 0;
  }
  if (previous === 0) {
    return 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function generateInsights(
  wallets: Wallet[],
  monthExpenses: number,
  prevMonthExpenses: number,
  totalBalance: number,
  currency: string,
): InsightCardProps[] {
  const list: InsightCardProps[] = [];

  const changePercent = computePercentChange(monthExpenses, prevMonthExpenses);
  if (Math.abs(changePercent) >= 10) {
    const direction = changePercent > 0 ? 'increased' : 'decreased';
    list.push({
      type: 'spending_change',
      title: 'Spending Trend',
      message: `Your spending has ${direction} by ${Math.abs(changePercent).toFixed(1)}% compared to last month.`,
      severity: changePercent > 20 ? 'warning' : 'info',
    });
  }

  const lowBalanceWallets = wallets.filter(
    (w) => w.isActive && w.balance < 100_00,
  );
  if (lowBalanceWallets.length > 0) {
    const names = lowBalanceWallets.map((w) => w.name).join(', ');
    list.push({
      type: 'low_balance',
      title: 'Low Balance Alert',
      message: `${names} ${lowBalanceWallets.length === 1 ? 'has' : 'have'} a balance under ${currency} 100.`,
      severity: 'alert',
    });
  }

  if (totalBalance < 0) {
    list.push({
      type: 'low_balance',
      title: 'Negative Total Balance',
      message:
        'Your combined wallet balance is negative. Consider reviewing recent expenses.',
      severity: 'alert',
    });
  }

  return list;
}

export function useDashboard(): DashboardData {
  const baseCurrency = useAppStore((s) => s.baseCurrency);

  const {
    transactions,
    isLoading: txLoading,
    error: txError,
    refetch: txRefetch,
  } = useTransactions({syncWithFilterStore: false});

  const {
    wallets,
    isLoading: walletLoading,
    error: walletError,
    refetch: walletRefetch,
  } = useWallets();

  const monthRange = useMemo(getMonthRange, []);
  const prevMonthRange = useMemo(getPrevMonthRange, []);

  const totalBalance = useMemo(
    () =>
      wallets
        .filter((w) => w.isActive)
        .reduce((sum, w) => sum + w.balance, 0),
    [wallets],
  );

  const monthIncome = useMemo(
    () => sumByType(transactions, 'income', monthRange),
    [transactions, monthRange],
  );

  const monthExpenses = useMemo(
    () => sumByType(transactions, 'expense', monthRange),
    [transactions, monthRange],
  );

  const prevMonthExpenses = useMemo(
    () => sumByType(transactions, 'expense', prevMonthRange),
    [transactions, prevMonthRange],
  );

  const percentChange = useMemo(
    () => computePercentChange(monthExpenses, prevMonthExpenses),
    [monthExpenses, prevMonthExpenses],
  );

  const weeklySpending = useMemo(
    () => buildWeeklySpending(transactions),
    [transactions],
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions],
  );

  const insights = useMemo(
    () =>
      generateInsights(
        wallets,
        monthExpenses,
        prevMonthExpenses,
        totalBalance,
        baseCurrency,
      ),
    [wallets, monthExpenses, prevMonthExpenses, totalBalance, baseCurrency],
  );

  const isLoading = txLoading || walletLoading;
  const error = txError ?? walletError;

  const refetch = useCallback(() => {
    txRefetch();
    walletRefetch();
  }, [txRefetch, walletRefetch]);

  return {
    totalBalance,
    baseCurrency,
    percentChange,
    monthIncome,
    monthExpenses,
    weeklySpending,
    recentTransactions,
    insights,
    wallets,
    isLoading,
    error,
    refetch,
  };
}
