import {toDomain, toRaw, type GoalRaw} from '@data/mappers/goal-mapper';
import type {Goal} from '@domain/entities/Goal';

describe('goal-mapper', () => {
  const sampleEntity: Goal = {
    id: 'g-1',
    name: 'Trip',
    targetAmount: 100_000,
    currentAmount: 25_000,
    currency: 'USD',
    deadline: 1_800_000_000_000,
    icon: 'plane',
    color: '#00aaff',
    category: 'vacation',
    isCompleted: false,
    completedAt: 1_750_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: GoalRaw = {
    id: 'g-1',
    name: 'Trip',
    targetAmount: 100_000,
    currentAmount: 25_000,
    currency: 'USD',
    deadline: 1_800_000_000_000,
    icon: 'plane',
    color: '#00aaff',
    category: 'vacation',
    isCompleted: false,
    completedAt: 1_750_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.name).toBe(sampleRaw.name);
    expect(entity.targetAmount).toBe(sampleRaw.targetAmount);
    expect(entity.currentAmount).toBe(sampleRaw.currentAmount);
    expect(entity.currency).toBe(sampleRaw.currency);
    expect(entity.deadline).toBe(sampleRaw.deadline);
    expect(entity.icon).toBe(sampleRaw.icon);
    expect(entity.color).toBe(sampleRaw.color);
    expect(entity.category).toBe('vacation');
    expect(entity.isCompleted).toBe(sampleRaw.isCompleted);
    expect(entity.completedAt).toBe(sampleRaw.completedAt);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert null completedAt to undefined in toDomain', () => {
    const raw: GoalRaw = {...sampleRaw, completedAt: null};
    expect(toDomain(raw).completedAt).toBeUndefined();
  });

  it('should convert undefined completedAt to null in toRaw', () => {
    const entity: Goal = {...sampleEntity, completedAt: undefined};
    expect(toRaw(entity).completedAt).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.category).toBe(sampleEntity.category);
    expect(raw.completedAt).toBe(sampleEntity.completedAt ?? null);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip without completedAt', () => {
    const entity: Goal = {...sampleEntity, completedAt: undefined};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
