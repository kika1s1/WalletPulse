import type {Tag} from '@domain/entities/Tag';

export type TagRaw = {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: TagRaw): Tag {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color ?? '',
    usageCount: raw.usageCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Tag): Omit<TagRaw, 'id'> {
  return {
    name: entity.name,
    color: entity.color === '' ? null : entity.color,
    usageCount: entity.usageCount,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
