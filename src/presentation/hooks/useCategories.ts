import {useState, useEffect, useCallback, useMemo} from 'react';
import database from '@data/database';
import CategoryModel from '@data/database/models/CategoryModel';
import {Q} from '@nozbe/watermelondb';
import {toDomain} from '@data/mappers/category-mapper';
import {hasType, type Category} from '@domain/entities/Category';

export type UseCategoriesReturn = {
  categories: Category[];
  isLoading: boolean;
  getByType: (type: 'expense' | 'income') => Category[];
  getById: (id: string) => Category | undefined;
};

function categoryModelToDomain(model: CategoryModel): Category {
  return toDomain({
    id: model.id,
    name: model.name,
    icon: model.icon,
    color: model.color,
    type: model.type,
    parentId: model.parentId,
    isDefault: model.isDefault,
    isArchived: model.isArchived,
    sortOrder: model.sortOrder,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  });
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const collection = database.get<CategoryModel>('categories');
    const query = collection.query(Q.sortBy('sort_order', Q.asc));

    setIsLoading(true);

    const subscription = query.observe().subscribe({
      next: (models) => {
        setCategories(models.map(categoryModelToDomain));
        setIsLoading(false);
      },
      error: () => {
        setCategories([]);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const getByType = useCallback(
    (type: 'expense' | 'income') => categories.filter((c) => hasType(c, type)),
    [categories],
  );

  const getById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories],
  );

  return useMemo(
    () => ({
      categories,
      isLoading,
      getByType,
      getById,
    }),
    [categories, isLoading, getByType, getById],
  );
}
