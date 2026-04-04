import type {Category, CategoryKind} from '@domain/entities/Category';

export type CategoryRaw = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  parentId: string | null;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: CategoryRaw): Category {
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon,
    color: raw.color,
    type: raw.type as CategoryKind,
    parentId: raw.parentId === null ? undefined : raw.parentId,
    isDefault: raw.isDefault,
    isArchived: raw.isArchived,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Category): Omit<CategoryRaw, 'id'> {
  return {
    name: entity.name,
    icon: entity.icon,
    color: entity.color,
    type: entity.type,
    parentId: entity.parentId === undefined ? null : entity.parentId,
    isDefault: entity.isDefault,
    isArchived: entity.isArchived,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
