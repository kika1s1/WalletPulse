import {useState, useEffect, useCallback, useRef} from 'react';
import type {Budget} from '@domain/entities/Budget';
import {isOverallBudget} from '@domain/entities/Budget';
import type {
  CalculateBudgetProgressResult,
  BudgetProgressStatus,
} from '@domain/usecases/calculate-budget-progress';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeCalculateBudgetProgress} from '@domain/usecases/calculate-budget-progress';

export type BudgetProgressItem = CalculateBudgetProgressResult & {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
};

export type UseBudgetProgressReturn = {
  items: BudgetProgressItem[];
  overallItem: BudgetProgressItem | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  totalBudget: number;
  totalSpent: number;
};

export function useBudgetProgress(
  budgets: Budget[],
): UseBudgetProgressReturn {
  const [items, setItems] = useState<BudgetProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (budgets.length === 0) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getLocalDataSource();
        const calculate = makeCalculateBudgetProgress({
          budgetRepo: ds.budgets,
          transactionRepo: ds.transactions,
        });

        const results: BudgetProgressItem[] = [];

        for (const budget of budgets) {
          const progress = await calculate(budget.id);

          let categoryName = 'Overall';
          let categoryIcon = 'chart-bar';
          let categoryColor = '#6C5CE7';

          if (!isOverallBudget(budget) && budget.categoryId) {
            const cat = await ds.categories.findById(budget.categoryId);
            if (cat) {
              categoryName = cat.name;
              categoryIcon = cat.icon;
              categoryColor = cat.color;
            }
          }

          results.push({
            ...progress,
            categoryName,
            categoryIcon,
            categoryColor,
          });
        }

        if (!cancelled && mountedRef.current) {
          setItems(results);
        }
      } catch (e) {
        if (!cancelled && mountedRef.current) {
          setError(e instanceof Error ? e.message : 'Failed to load budgets');
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [budgets, tick]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const overallItem = items.find((i) => isOverallBudget(i.budget)) ?? null;
  const categoryItems = items.filter((i) => !isOverallBudget(i.budget));

  const totalBudget = categoryItems.reduce((sum, i) => sum + i.budget.amount, 0);
  const totalSpent = categoryItems.reduce((sum, i) => sum + i.spent, 0);

  return {
    items: categoryItems,
    overallItem,
    isLoading,
    error,
    refetch,
    totalBudget,
    totalSpent,
  };
}
