import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import database from '@data/database';
import BudgetModel from '@data/database/models/BudgetModel';
import {Q} from '@nozbe/watermelondb';
import {toDomain} from '@data/mappers/budget-mapper';
import type {Budget} from '@domain/entities/Budget';

export type UseBudgetsReturn = {
  budgets: Budget[];
  activeBudgets: Budget[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

function modelToDomain(model: BudgetModel): Budget {
  return toDomain({
    id: model.id,
    categoryId: model.categoryId,
    amount: model.amount,
    currency: model.currency,
    period: model.period,
    startDate: model.startDate,
    endDate: model.endDate,
    rollover: model.rollover,
    isActive: model.isActive,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  });
}

export function useBudgets(): UseBudgetsReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<BudgetModel>('budgets');
    const query = collection.query(Q.sortBy('created_at', Q.desc));

    if (!hasData.current) {setIsLoading(true);}
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setBudgets(models.map(modelToDomain));
        setIsLoading(false);
        setError(null);
      },
      error: (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refetchKey]);

  const activeBudgets = useMemo(
    () => budgets.filter((b) => b.isActive),
    [budgets],
  );

  return {budgets, activeBudgets, isLoading, error, refetch};
}
