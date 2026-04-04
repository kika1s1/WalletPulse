import {useMemo} from 'react';
import {useTransactions} from './useTransactions';
import {useAppStore} from '@presentation/stores/useAppStore';
import {startOfDay, endOfDay, daysAgo} from '@shared/utils/date-helpers';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import type {Transaction} from '@domain/entities/Transaction';

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  percentage: number;
  count: number;
};

export type DailyTrend = {
  label: string;
  income: number;
  expense: number;
  date: string;
};

export type AnalyticsData = {
  baseCurrency: string;
  totalIncome: number;
  totalExpenses: number;
  totalTransactions: number;
  netFlow: number;
  categoryBreakdown: CategoryBreakdown[];
  dailyTrend: DailyTrend[];
  topMerchants: {name: string; total: number; count: number}[];
  avgDailySpending: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthRange(): {startMs: number; endMs: number} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(Date.now()),
  };
}

function buildCategoryBreakdown(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  const map = new Map<
    string,
    {total: number; count: number}
  >();

  for (const tx of expenses) {
    const entry = map.get(tx.categoryId) ?? {total: 0, count: 0};
    entry.total += tx.amount;
    entry.count += 1;
    map.set(tx.categoryId, entry);
  }

  const result: CategoryBreakdown[] = [];
  for (const [catId, data] of map.entries()) {
    const cat = DEFAULT_CATEGORIES.find((c) => c.name === catId);
    result.push({
      categoryId: catId,
      categoryName: cat?.name ?? catId,
      categoryColor: cat?.color ?? '#B2BEC3',
      categoryIcon: cat?.icon ?? '?',
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      count: data.count,
    });
  }

  result.sort((a, b) => b.total - a.total);
  return result;
}

function buildDailyTrend(transactions: Transaction[]): DailyTrend[] {
  const now = Date.now();
  const result: DailyTrend[] = [];

  for (let i = 29; i >= 0; i--) {
    const dayMs = daysAgo(i, now);
    const dayStart = startOfDay(dayMs);
    const dayEnd = endOfDay(dayMs);
    const d = new Date(dayMs);
    const dow = DAY_SHORT[d.getDay()];
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;

    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.transactionDate >= dayStart && tx.transactionDate <= dayEnd) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense') {
          expense += tx.amount;
        }
      }
    }

    result.push({
      label: i < 7 ? dow : dateStr,
      income,
      expense,
      date: dateStr,
    });
  }

  return result;
}

function buildTopMerchants(
  transactions: Transaction[],
): {name: string; total: number; count: number}[] {
  const expenses = transactions.filter(
    (t) => t.type === 'expense' && t.merchant.trim() !== '',
  );
  const map = new Map<string, {total: number; count: number}>();

  for (const tx of expenses) {
    const key = tx.merchant.trim().toLowerCase();
    const entry = map.get(key) ?? {total: 0, count: 0};
    entry.total += tx.amount;
    entry.count += 1;
    map.set(key, entry);
  }

  const list = Array.from(map.entries())
    .map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...data,
    }))
    .sort((a, b) => b.total - a.total);

  return list.slice(0, 5);
}

export function useAnalytics(): AnalyticsData {
  const baseCurrency = useAppStore((s) => s.baseCurrency);

  const {
    transactions,
    isLoading,
    error,
    refetch,
  } = useTransactions({syncWithFilterStore: false});

  const monthRange = useMemo(getMonthRange, []);

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.transactionDate >= monthRange.startMs &&
          t.transactionDate <= monthRange.endMs,
      ),
    [transactions, monthRange],
  );

  const totalIncome = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );

  const totalExpenses = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0),
    [monthTransactions],
  );

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(monthTransactions),
    [monthTransactions],
  );

  const dailyTrend = useMemo(
    () => buildDailyTrend(transactions),
    [transactions],
  );

  const topMerchants = useMemo(
    () => buildTopMerchants(monthTransactions),
    [monthTransactions],
  );

  const daysInMonth = useMemo(() => {
    const now = new Date();
    return now.getDate();
  }, []);

  const avgDailySpending = useMemo(
    () => (daysInMonth > 0 ? Math.round(totalExpenses / daysInMonth) : 0),
    [totalExpenses, daysInMonth],
  );

  return {
    baseCurrency,
    totalIncome,
    totalExpenses,
    totalTransactions: monthTransactions.length,
    netFlow: totalIncome - totalExpenses,
    categoryBreakdown,
    dailyTrend,
    topMerchants,
    avgDailySpending,
    isLoading,
    error,
    refetch,
  };
}
