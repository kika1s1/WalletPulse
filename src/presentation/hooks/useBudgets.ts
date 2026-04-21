import {useState, useEffect, useCallback, useMemo} from 'react';
import type {Budget} from '@domain/entities/Budget';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

export type UseBudgetsReturn = {
  budgets: Budget[];
  activeBudgets: Budget[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useBudgets(): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const data = await ds.budgets.findAll();
        if (!cancelled) {
          setBudgets(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [refetchKey]);

  const activeBudgets = useMemo(
    () => budgets.filter((b) => b.isActive),
    [budgets],
  );

  return {budgets, activeBudgets, isLoading, error, refetch};
}
