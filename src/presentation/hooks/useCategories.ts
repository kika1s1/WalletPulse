import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import CategoryModel from '@data/database/models/CategoryModel';
import {Q} from '@nozbe/watermelondb';
import type {Category} from '@domain/entities/Category';

export type UseCategoriesReturn = {
  categories: Category[];
  expenseCategories: Category[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

function modelToDomain(model: CategoryModel): Category {
  return {
    id: model.id,
    name: model.name,
    icon: model.icon,
    color: model.color,
    type: model.type as Category['type'],
    parentId: model.parentId || undefined,
    isDefault: model.isDefault,
    isArchived: model.isArchived,
    sortOrder: model.sortOrder,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  };
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<CategoryModel>('categories');
    const query = collection.query(
      Q.where('is_archived', false),
      Q.sortBy('sort_order', Q.asc),
    );

    if (!hasData.current) setIsLoading(true);
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setCategories(models.map(modelToDomain));
        setIsLoading(false);
      },
      error: (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refetchKey]);

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' || c.type === 'both',
  );

  return {categories, expenseCategories, isLoading, error, refetch};
}
