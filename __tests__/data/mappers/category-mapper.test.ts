import {toDomain, toRaw, type CategoryRaw} from '@data/mappers/category-mapper';
import type {Category} from '@domain/entities/Category';

describe('category-mapper', () => {
  const sampleEntity: Category = {
    id: 'c-1',
    name: 'Food',
    icon: 'food',
    color: '#ff00aa',
    type: 'expense',
    parentId: 'c-parent',
    isDefault: false,
    isArchived: false,
    sortOrder: 2,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: CategoryRaw = {
    id: 'c-1',
    name: 'Food',
    icon: 'food',
    color: '#ff00aa',
    type: 'expense',
    parentId: 'c-parent',
    isDefault: false,
    isArchived: false,
    sortOrder: 2,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.name).toBe(sampleRaw.name);
    expect(entity.icon).toBe(sampleRaw.icon);
    expect(entity.color).toBe(sampleRaw.color);
    expect(entity.type).toBe('expense');
    expect(entity.parentId).toBe('c-parent');
    expect(entity.isDefault).toBe(sampleRaw.isDefault);
    expect(entity.isArchived).toBe(sampleRaw.isArchived);
    expect(entity.sortOrder).toBe(sampleRaw.sortOrder);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert null parentId to undefined in toDomain', () => {
    const raw: CategoryRaw = {...sampleRaw, parentId: null};
    expect(toDomain(raw).parentId).toBeUndefined();
  });

  it('should convert undefined parentId to null in toRaw', () => {
    const entity: Category = {...sampleEntity, parentId: undefined};
    expect(toRaw(entity).parentId).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.name).toBe(sampleEntity.name);
    expect(raw.type).toBe(sampleEntity.type);
    expect(raw.parentId).toBe(sampleEntity.parentId ?? null);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip with no parent', () => {
    const entity: Category = {...sampleEntity, parentId: undefined};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
