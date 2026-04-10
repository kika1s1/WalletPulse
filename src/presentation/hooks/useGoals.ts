import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import GoalModel from '@data/database/models/GoalModel';
import {Q} from '@nozbe/watermelondb';
import type {Goal, CreateGoalInput} from '@domain/entities/Goal';
import {createGoal} from '@domain/entities/Goal';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';

function modelToDomain(model: GoalModel): Goal {
  return {
    id: model.id,
    name: model.name,
    targetAmount: model.targetAmount,
    currentAmount: model.currentAmount,
    currency: model.currency,
    deadline: model.deadline,
    icon: model.icon,
    color: model.color,
    category: model.category as Goal['category'],
    isCompleted: model.isCompleted,
    completedAt: model.completedAt ?? undefined,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  };
}

export type UseGoalsReturn = {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<GoalModel>('goals');
    const query = collection.query(Q.sortBy('created_at', Q.desc));

    if (!hasData.current) {setIsLoading(true);}
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setGoals(models.map(modelToDomain));
        setIsLoading(false);
      },
      error: (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refetchKey]);

  return {goals, isLoading, error, refetch};
}

export type UseGoalActionsReturn = {
  saveGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  updateProgress: (id: string, currentAmount: number) => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function useGoalActions(): UseGoalActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveGoal = useCallback(async (input: CreateGoalInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const goal = createGoal(input);
      await getLocalDataSource().goals.save(goal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateGoal = useCallback(async (goal: Goal) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().goals.update(goal);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateProgress = useCallback(
    async (id: string, currentAmount: number) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await getLocalDataSource().goals.updateProgress(id, currentAmount);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const markCompleted = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().goals.markCompleted(id, Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().goals.delete(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {saveGoal, updateGoal, updateProgress, markCompleted, deleteGoal, isSubmitting, error};
}
