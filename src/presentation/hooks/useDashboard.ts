import {useMemo, useCallback, useState, useEffect, useRef} from 'react';
import {useTransactions} from './useTransactions';
import {useWallets} from './useWallets';
import {useAppStore} from '@presentation/stores/useAppStore';
import {startOfDay, endOfDay, daysAgo, getWeekDayLabels} from '@shared/utils/date-helpers';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeGetConversionRate} from '@infrastructure/fx-service';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {DaySpending} from '@presentation/components/charts/MiniBarChart';
import type {InsightCardProps} from '@presentation/components/InsightCard';

export type DashboardData = {
  totalBalance: number;
  baseCurrency: string;
  displayCurrency: string;
  displayBalance: number;
  percentChange: number;
  monthIncome: number;
  monthExpenses: number;
  weeklySpending: DaySpending[];
  recentTransactions: Transaction[];
  insights: InsightCardProps[];
  wallets: Wallet[];
  selectedWalletId: string | null;
  setSelectedWalletId: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const DEFAULT_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function buildWeeklySpending(
  transactions: Transaction[],
  baseCurrency: string,
  rates: RateMap,
  dayLabels: string[] = DEFAULT_DAY_LABELS,
): DaySpending[] {
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
      .reduce(
        (sum, t) =>
          sum + convertToBase(t.amount, t.currency, baseCurrency, rates),
        0,
      );

    result.push({
      label: dayLabels[dow] ?? DEFAULT_DAY_LABELS[dow],
      amount: dayTotal,
      isToday: dow === todayDow && i === 0,
    });
  }

  return result;
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

type RateMap = Record<string, number>;

function useConversionRates(
  currencies: string[],
  baseCurrency: string,
): RateMap {
  const [rates, setRates] = useState<RateMap>({});
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = [...currencies].sort().join(',') + ':' + baseCurrency;
    if (key === fetchedRef.current) return;
    fetchedRef.current = key;

    const uniqueNonBase = currencies.filter(
      (c) => c.toUpperCase() !== baseCurrency.toUpperCase(),
    );
    if (uniqueNonBase.length === 0) {
      setRates({});
      return;
    }

    let cancelled = false;
    (async () => {
      const ds = getLocalDataSource();
      const getRate = makeGetConversionRate({fxRateRepo: ds.fxRates});
      const result: RateMap = {};
      for (const c of uniqueNonBase) {
        try {
          const r = await getRate(c, baseCurrency);
          if (r !== null) result[c.toUpperCase()] = r;
        } catch {
          // Skip currencies without rate data
        }
      }
      if (!cancelled) setRates(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [currencies, baseCurrency]);

  return rates;
}

function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: RateMap,
): number {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) return amount;
  const rate = rates[currency.toUpperCase()];
  if (!rate) return amount;
  return Math.round(amount * rate);
}

export function useDashboard(): DashboardData {
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const {
    transactions: allTransactions,
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

  const selectedWallet = useMemo(
    () => (selectedWalletId ? wallets.find((w) => w.id === selectedWalletId) ?? null : null),
    [wallets, selectedWalletId],
  );

  const transactions = useMemo(
    () =>
      selectedWalletId
        ? allTransactions.filter((t) => t.walletId === selectedWalletId)
        : allTransactions,
    [allTransactions, selectedWalletId],
  );

  const activeCurrency = selectedWallet?.currency ?? baseCurrency;

  const allCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const w of wallets) set.add(w.currency.toUpperCase());
    for (const t of allTransactions) set.add(t.currency.toUpperCase());
    return Array.from(set);
  }, [wallets, allTransactions]);

  const fxRates = useConversionRates(allCurrencies, baseCurrency);

  const monthRange = useMemo(getMonthRange, []);
  const prevMonthRange = useMemo(getPrevMonthRange, []);

  const totalBalance = useMemo(
    () =>
      wallets
        .filter((w) => w.isActive)
        .reduce(
          (sum, w) =>
            sum + convertToBase(w.balance, w.currency, baseCurrency, fxRates),
          0,
        ),
    [wallets, baseCurrency, fxRates],
  );

  const displayBalance = selectedWallet ? selectedWallet.balance : totalBalance;
  const displayCurrency = activeCurrency;

  const monthIncome = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === 'income' &&
            t.transactionDate >= monthRange.startMs &&
            t.transactionDate <= monthRange.endMs,
        )
        .reduce(
          (sum, t) =>
            selectedWalletId
              ? sum + t.amount
              : sum + convertToBase(t.amount, t.currency, baseCurrency, fxRates),
          0,
        ),
    [transactions, monthRange, baseCurrency, fxRates, selectedWalletId],
  );

  const monthExpenses = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.transactionDate >= monthRange.startMs &&
            t.transactionDate <= monthRange.endMs,
        )
        .reduce(
          (sum, t) =>
            selectedWalletId
              ? sum + t.amount
              : sum + convertToBase(t.amount, t.currency, baseCurrency, fxRates),
          0,
        ),
    [transactions, monthRange, baseCurrency, fxRates, selectedWalletId],
  );

  const prevMonthExpenses = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.transactionDate >= prevMonthRange.startMs &&
            t.transactionDate <= prevMonthRange.endMs,
        )
        .reduce(
          (sum, t) =>
            selectedWalletId
              ? sum + t.amount
              : sum + convertToBase(t.amount, t.currency, baseCurrency, fxRates),
          0,
        ),
    [transactions, prevMonthRange, baseCurrency, fxRates, selectedWalletId],
  );

  const percentChange = useMemo(
    () => computePercentChange(monthExpenses, prevMonthExpenses),
    [monthExpenses, prevMonthExpenses],
  );

  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const dayLabels = useMemo(() => getWeekDayLabels(firstDayOfWeek), [firstDayOfWeek]);

  const weeklySpending = useMemo(
    () =>
      selectedWalletId
        ? buildWeeklySpending(transactions, activeCurrency, {}, dayLabels)
        : buildWeeklySpending(transactions, baseCurrency, fxRates, dayLabels),
    [transactions, baseCurrency, activeCurrency, fxRates, dayLabels, selectedWalletId],
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
    displayCurrency,
    displayBalance,
    percentChange,
    monthIncome,
    monthExpenses,
    weeklySpending,
    recentTransactions,
    insights,
    wallets,
    selectedWalletId,
    setSelectedWalletId,
    isLoading,
    error,
    refetch,
  };
}
