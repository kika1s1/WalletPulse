import {useMemo, useState, useEffect, useRef} from 'react';
import {useTransactions} from './useTransactions';
import {useCategories} from './useCategories';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {startOfDay, endOfDay, formatDateLong} from '@shared/utils/date-helpers';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeGetConversionRate} from '@infrastructure/fx-service';
import type {Category} from '@domain/entities/Category';
import type {Transaction} from '@domain/entities/Transaction';

export type AnalyticsDateRange = {
  startMs: number;
  endMs: number;
};

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
  rangeSubtitle: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MS_PER_DAY = 86400000;

const CHART_PALETTE = [
  '#6C5CE7',
  '#00B894',
  '#FDCB6E',
  '#E17055',
  '#0984E3',
  '#E84393',
  '#00CEC9',
  '#FF7675',
  '#A29BFE',
  '#55EFC4',
  '#FAB1A0',
  '#74B9FF',
];

function getDefaultMonthRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(Date.now()),
  };
}

function inclusiveCalendarDays(startMs: number, endMs: number): number {
  const s = startOfDay(startMs);
  const e = startOfDay(endMs);
  return Math.max(1, Math.floor((e - s) / MS_PER_DAY) + 1);
}

type DateFormat = 'US' | 'EU' | 'ISO';

function formatRangeSubtitle(startMs: number, endMs: number, dateFormat: DateFormat = 'US'): string {
  return `${formatDateLong(startMs, dateFormat)} to ${formatDateLong(endMs, dateFormat)}`;
}

function formatDayLabel(d: Date, dateFormat: DateFormat): string {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  switch (dateFormat) {
    case 'EU':
      return `${day}/${month}`;
    case 'ISO':
      return `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    default:
      return `${month}/${day}`;
  }
}

type RateMap = Record<string, number>;

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

function buildCategoryBreakdown(
  transactions: Transaction[],
  categoryList: Category[],
  baseCurrency: string,
  rates: RateMap,
): CategoryBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce(
    (s, t) => s + convertToBase(t.amount, t.currency, baseCurrency, rates),
    0,
  );

  const map = new Map<string, {total: number; count: number}>();

  for (const tx of expenses) {
    const entry = map.get(tx.categoryId) ?? {total: 0, count: 0};
    entry.total += convertToBase(tx.amount, tx.currency, baseCurrency, rates);
    entry.count += 1;
    map.set(tx.categoryId, entry);
  }

  const result: CategoryBreakdown[] = [];
  let paletteIdx = 0;
  for (const [catId, data] of map.entries()) {
    const cat = categoryList.find(
      (c) => c.id === catId || c.name === catId,
    );
    const color = cat?.color || CHART_PALETTE[paletteIdx % CHART_PALETTE.length];
    paletteIdx += 1;
    result.push({
      categoryId: catId,
      categoryName: cat?.name ?? catId,
      categoryColor: color,
      categoryIcon: cat?.icon ?? 'shape-outline',
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      count: data.count,
    });
  }

  result.sort((a, b) => b.total - a.total);

  const seen = new Set<string>();
  for (let i = 0; i < result.length; i++) {
    if (seen.has(result[i].categoryColor)) {
      result[i] = {
        ...result[i],
        categoryColor: CHART_PALETTE[i % CHART_PALETTE.length],
      };
    }
    seen.add(result[i].categoryColor);
  }

  return result;
}

function buildDailyTrend(
  transactions: Transaction[],
  range: AnalyticsDateRange,
  baseCurrency: string,
  rates: RateMap,
  dateFormat: DateFormat = 'US',
): DailyTrend[] {
  const dayTotals = new Map<
    number,
    {income: number; expense: number}
  >();

  for (const tx of transactions) {
    if (
      tx.transactionDate < range.startMs ||
      tx.transactionDate > range.endMs
    ) {
      continue;
    }
    const dayKey = startOfDay(tx.transactionDate);
    const bucket = dayTotals.get(dayKey) ?? {income: 0, expense: 0};
    const conv = convertToBase(tx.amount, tx.currency, baseCurrency, rates);
    if (tx.type === 'income') {
      bucket.income += conv;
    } else if (tx.type === 'expense') {
      bucket.expense += conv;
    }
    dayTotals.set(dayKey, bucket);
  }

  const result: DailyTrend[] = [];
  let cursor = startOfDay(range.startMs);
  const rangeEnd = startOfDay(range.endMs);

  const spanDays =
    Math.floor((rangeEnd - startOfDay(range.startMs)) / MS_PER_DAY) + 1;
  const preferDowLabels = spanDays <= 14;

  while (cursor <= rangeEnd) {
    const d = new Date(cursor);
    const dow = DAY_SHORT[d.getDay()];
    const dateStr = formatDayLabel(d, dateFormat);
    const bucket = dayTotals.get(cursor) ?? {income: 0, expense: 0};
    result.push({
      label: preferDowLabels ? dow : dateStr,
      income: bucket.income,
      expense: bucket.expense,
      date: dateStr,
    });
    cursor += MS_PER_DAY;
  }

  return result;
}

function buildTopMerchants(
  transactions: Transaction[],
  baseCurrency: string,
  rates: RateMap,
): {name: string; total: number; count: number}[] {
  const expenses = transactions.filter(
    (t) => t.type === 'expense' && t.merchant.trim() !== '',
  );
  const map = new Map<string, {total: number; count: number}>();

  for (const tx of expenses) {
    const key = tx.merchant.trim().toLowerCase();
    const entry = map.get(key) ?? {total: 0, count: 0};
    entry.total += convertToBase(tx.amount, tx.currency, baseCurrency, rates);
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

export type UseAnalyticsOptions = {
  dateRange?: AnalyticsDateRange;
};

export function useAnalytics(options?: UseAnalyticsOptions): AnalyticsData {
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const {categories} = useCategories();

  const {
    transactions,
    isLoading,
    error,
    refetch,
  } = useTransactions({syncWithFilterStore: false});

  const effectiveRange = useMemo(() => {
    if (options?.dateRange) {
      const {startMs, endMs} = options.dateRange;
      if (startMs <= endMs) {
        return options.dateRange;
      }
      return {startMs: endMs, endMs: startMs};
    }
    return getDefaultMonthRange();
  }, [options?.dateRange]);

  const allCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) set.add(t.currency.toUpperCase());
    return Array.from(set);
  }, [transactions]);

  const fxRates = useConversionRates(allCurrencies, baseCurrency);

  const rangeTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.transactionDate >= effectiveRange.startMs &&
          t.transactionDate <= effectiveRange.endMs,
      ),
    [transactions, effectiveRange],
  );

  const totalIncome = useMemo(
    () =>
      rangeTransactions
        .filter((t) => t.type === 'income')
        .reduce(
          (s, t) =>
            s + convertToBase(t.amount, t.currency, baseCurrency, fxRates),
          0,
        ),
    [rangeTransactions, baseCurrency, fxRates],
  );

  const totalExpenses = useMemo(
    () =>
      rangeTransactions
        .filter((t) => t.type === 'expense')
        .reduce(
          (s, t) =>
            s + convertToBase(t.amount, t.currency, baseCurrency, fxRates),
          0,
        ),
    [rangeTransactions, baseCurrency, fxRates],
  );

  const categoryBreakdown = useMemo(
    () =>
      buildCategoryBreakdown(
        rangeTransactions,
        categories,
        baseCurrency,
        fxRates,
      ),
    [rangeTransactions, categories, baseCurrency, fxRates],
  );

  const dailyTrend = useMemo(
    () => buildDailyTrend(transactions, effectiveRange, baseCurrency, fxRates, dateFormat),
    [transactions, effectiveRange, baseCurrency, fxRates, dateFormat],
  );

  const topMerchants = useMemo(
    () => buildTopMerchants(rangeTransactions, baseCurrency, fxRates),
    [rangeTransactions, baseCurrency, fxRates],
  );

  const daysInRange = useMemo(
    () => inclusiveCalendarDays(effectiveRange.startMs, effectiveRange.endMs),
    [effectiveRange.startMs, effectiveRange.endMs],
  );

  const avgDailySpending = useMemo(
    () =>
      daysInRange > 0 ? Math.round(totalExpenses / daysInRange) : 0,
    [totalExpenses, daysInRange],
  );

  const rangeSubtitle = useMemo(
    () => formatRangeSubtitle(effectiveRange.startMs, effectiveRange.endMs, dateFormat),
    [effectiveRange.startMs, effectiveRange.endMs, dateFormat],
  );

  return {
    baseCurrency,
    totalIncome,
    totalExpenses,
    totalTransactions: rangeTransactions.length,
    netFlow: totalIncome - totalExpenses,
    categoryBreakdown,
    dailyTrend,
    topMerchants,
    avgDailySpending,
    rangeSubtitle,
    isLoading,
    error,
    refetch,
  };
}
