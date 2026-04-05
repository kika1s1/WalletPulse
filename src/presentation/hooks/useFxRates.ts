import {useState, useEffect, useCallback, useRef} from 'react';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {getRemoteDataSource} from '@data/datasources/RemoteDataSource';
import {
  makeFetchAndCacheRates,
  makeGetConversionRate,
  convertAmountCents,
  STALE_THRESHOLD_MS,
} from '@infrastructure/fx-service';
import {useAppStore} from '@presentation/stores/useAppStore';
import type {FxRate} from '@domain/entities/FxRate';

export type UseFxRatesReturn = {
  rates: FxRate[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  isStale: boolean;
  refresh: () => Promise<void>;
};

import Config from 'react-native-config';

function getApiKey(): string {
  return Config?.FX_API_KEY ?? '';
}

export function useFxRates(): UseFxRatesReturn {
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCached = useCallback(async () => {
    try {
      const ds = getLocalDataSource();
      const cached = await ds.fxRates.findAllByBase(baseCurrency);
      if (mountedRef.current) {
        setRates(cached);
        if (cached.length > 0) {
          const latest = Math.max(...cached.map((r) => r.fetchedAt));
          setLastFetched(latest);
        }
      }
    } catch {
      // Cached load failures are non-critical
    }
  }, [baseCurrency]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const refresh = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('FX API key not configured. Add FX_API_KEY to your .env file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ds = getLocalDataSource();
      const remote = getRemoteDataSource();
      const fetchAndCache = makeFetchAndCacheRates({
        fxRateRepo: ds.fxRates,
        fetchRates: remote.fetchExchangeRates,
      });

      const freshRates = await fetchAndCache(apiKey, baseCurrency);

      if (mountedRef.current) {
        setRates(freshRates);
        setLastFetched(Date.now());
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch rates';
        setError(msg);
        setIsLoading(false);
      }
    }
  }, [baseCurrency]);

  const isStale =
    lastFetched !== null && Date.now() - lastFetched > STALE_THRESHOLD_MS;

  return {rates, isLoading, error, lastFetched, isStale, refresh};
}

export type UseConvertCurrencyReturn = {
  convert: (
    amountCents: number,
    from: string,
    to: string,
  ) => Promise<{amountCents: number; rate: number} | null>;
  getRate: (from: string, to: string) => Promise<number | null>;
};

export function useConvertCurrency(): UseConvertCurrencyReturn {
  const convert = useCallback(
    async (
      amountCents: number,
      from: string,
      to: string,
    ): Promise<{amountCents: number; rate: number} | null> => {
      const fromU = from.toUpperCase();
      const toU = to.toUpperCase();

      if (fromU === toU) {
        return {amountCents, rate: 1};
      }

      const ds = getLocalDataSource();
      const getConvRate = makeGetConversionRate({fxRateRepo: ds.fxRates});
      const rate = await getConvRate(fromU, toU);

      if (rate === null) {
        return null;
      }

      return {
        amountCents: convertAmountCents(amountCents, rate),
        rate,
      };
    },
    [],
  );

  const getRate = useCallback(
    async (from: string, to: string): Promise<number | null> => {
      const fromU = from.toUpperCase();
      const toU = to.toUpperCase();

      if (fromU === toU) {
        return 1;
      }

      const ds = getLocalDataSource();
      const getConvRate = makeGetConversionRate({fxRateRepo: ds.fxRates});
      return getConvRate(fromU, toU);
    },
    [],
  );

  return {convert, getRate};
}
