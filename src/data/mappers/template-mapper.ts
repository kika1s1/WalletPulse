import type {TransactionTemplate} from '@domain/usecases/quick-action-templates';
import type {TransactionType} from '@domain/entities/Transaction';

export type TemplateRaw = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  type: string;
  categoryId: string;
  description: string;
  merchant: string;
  usageCount: number;
  icon: string;
  color: string;
  tags: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

function parseTagsJson(tagsJson: string): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function toDomain(raw: TemplateRaw): TransactionTemplate {
  const parsedTags = parseTagsJson(raw.tags);
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon || 'receipt',
    color: raw.color || '#6C5CE7',
    type: raw.type as TransactionType,
    categoryId: raw.categoryId || undefined,
    amount: raw.amount || undefined,
    currency: raw.currency || undefined,
    description: raw.description || undefined,
    merchant: raw.merchant || undefined,
    tags: parsedTags.length > 0 ? parsedTags : undefined,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
  };
}

export function toRaw(entity: TransactionTemplate): Omit<TemplateRaw, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: entity.name,
    amount: entity.amount ?? 0,
    currency: entity.currency ?? '',
    type: entity.type,
    categoryId: entity.categoryId ?? '',
    description: entity.description ?? '',
    merchant: entity.merchant ?? '',
    usageCount: 0,
    icon: entity.icon,
    color: entity.color,
    tags: JSON.stringify(entity.tags ?? []),
    sortOrder: entity.sortOrder,
  };
}
