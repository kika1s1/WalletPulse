export type CategoryKind = 'expense' | 'income' | 'both';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryKind;
  parentId?: string;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateCategoryInput = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryKind;
  parentId?: string;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

const VALID_KINDS: readonly CategoryKind[] = ['expense', 'income', 'both'];

export function createCategory(input: CreateCategoryInput): Category {
  if (!input.name.trim()) {
    throw new Error('Category name is required');
  }
  if (!VALID_KINDS.includes(input.type)) {
    throw new Error('Invalid category type');
  }

  return {
    id: input.id,
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    type: input.type,
    parentId: input.parentId,
    isDefault: input.isDefault,
    isArchived: input.isArchived,
    sortOrder: input.sortOrder,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function isSubcategory(c: Category): boolean {
  return c.parentId !== undefined && c.parentId !== '';
}

export function hasType(c: Category, kind: 'expense' | 'income'): boolean {
  return c.type === kind || c.type === 'both';
}
