import {useMemo, useState, useEffect, useRef} from 'react';
import {useTransactions} from './useTransactions';
import {useWallets} from './useWallets';
import {useAppStore} from '@presentation/stores/useAppStore';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeGetConversionRate} from '@infrastructure/fx-service';
import {
  computeBalanceHistory,
  type BalanceHistoryPoint,
} from '@domain/usecases/calculate-balance-history';
import {startOfDay, endOfDay} from '@shared/utils/date-helpers';

export type BalancePeriod = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

type RateMap = Record<string, number>;

function periodToStartMs(period: BalancePeriod): number {
  const now = new Date();
  switch (period) {
    case '1W':
      return startOfDay(now.getTime() - 7 * 86_400_000);
    case '1M':
      return startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime());
    case '3M':
      return startOfDay(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).getTime());
    case '6M':
      return startOfDay(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).getTime());
    case '1Y':
      return startOfDay(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime());
    case 'ALL':
      return 0;
  }
}

function useConversionRates(currencies: string[], baseCurrency: string): RateMap {
  const [rates, setRates] = useState<RateMap>({});
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const key = [...currencies].sort().join(',') + ':' + baseCurrency;
    if (key === fetchedRef.current) {return;}
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
          if (r !== null) {result[c.toUpperCase()] = r;}
        } catch { /* skip */ }
      }
      if (!cancelled) {setRates(result);}
    })();
    return () => { cancelled = true; };
  }, [currencies, baseCurrency]);

  return rates;
}

export type UseBalanceHistoryReturn = {
  points: BalanceHistoryPoint[];
  period: BalancePeriod;
  setPeriod: (p: BalancePeriod) => void;
  baseCurrency: string;
  currentBalance: number;
  highWater: number;
  lowWater: number;
  changeAmount: number;
  changePercent: number;
  isLoading: boolean;
};

export function useBalanceHistory(): UseBalanceHistoryReturn {
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [period, setPeriod] = useState<BalancePeriod>('1M');

  const {transactions, isLoading: txLoading} = useTransactions({syncWithFilterStore: false});
  const {wallets, isLoading: walletLoading} = useWallets();

  const allCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {set.add(t.currency.toUpperCase());}
    return Array.from(set);
  }, [transactions]);

  const fxRates = useConversionRates(allCurrencies, baseCurrency);

  const periodStart = useMemo(() => periodToStartMs(period), [period]);

  const historyInputs = useMemo(
    () =>
      transactions
        .filter((t) => period === 'ALL' || t.transactionDate >= periodStart)
        .map((t) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          notes: t.notes,
          transactionDate: t.transactionDate,
          currency: t.currency,
        })),
    [transactions, period, periodStart],
  );

  const points = useMemo(
    () => computeBalanceHistory(historyInputs, baseCurrency, fxRates),
    [historyInputs, baseCurrency, fxRates],
  );

  const currentBalance = useMemo(
    () =>
      wallets
        .filter((w) => w.isActive)
        .reduce((sum, w) => {
          if (w.currency.toUpperCase() === baseCurrency.toUpperCase()) {return sum + w.balance;}
          const rate = fxRates[w.currency.toUpperCase()];
          return sum + (rate ? Math.round(w.balance * rate) : w.balance);
        }, 0),
    [wallets, baseCurrency, fxRates],
  );

  const stats = useMemo(() => {
    if (points.length === 0) {
      return {highWater: 0, lowWater: 0, changeAmount: 0, changePercent: 0};
    }
    const balances = points.map((p) => p.balance);
    const highWater = Math.max(...balances);
    const lowWater = Math.min(...balances);
    const first = points[0].balance;
    const last = points[points.length - 1].balance;
    const changeAmount = last - first;
    const changePercent = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 1000) / 10 : 0;
    return {highWater, lowWater, changeAmount, changePercent};
  }, [points]);

  return {
    points,
    period,
    setPeriod,
    baseCurrency,
    currentBalance,
    highWater: stats.highWater,
    lowWater: stats.lowWater,
    changeAmount: stats.changeAmount,
    changePercent: stats.changePercent,
    isLoading: txLoading || walletLoading,
  };
}
