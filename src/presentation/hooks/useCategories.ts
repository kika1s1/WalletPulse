import {useState, useEffect, useCallback} from 'react';
import type {Category} from '@domain/entities/Category';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';

export type UseCategoriesReturn = {
  categories: Category[];
  expenseCategories: Category[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
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
        const data = await ds.categories.findAll();
        const nonArchived = data.filter((c) => !c.isArchived);
        if (!cancelled) {
          setCategories(nonArchived);
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

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' || c.type === 'both',
  );

  return {categories, expenseCategories, isLoading, error, refetch};
}
