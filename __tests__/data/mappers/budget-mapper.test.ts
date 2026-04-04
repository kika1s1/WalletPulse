import {toDomain, toRaw, type BudgetRaw} from '@data/mappers/budget-mapper';
import type {Budget} from '@domain/entities/Budget';

describe('budget-mapper', () => {
  const sampleEntity: Budget = {
    id: 'b-1',
    categoryId: 'cat-9',
    amount: 50_000,
    currency: 'ETB',
    period: 'monthly',
    startDate: 1_700_000_000_000,
    endDate: 1_700_259_200_000,
    rollover: true,
    isActive: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: BudgetRaw = {
    id: 'b-1',
    categoryId: 'cat-9',
    amount: 50_000,
    currency: 'ETB',
    period: 'monthly',
    startDate: 1_700_000_000_000,
    endDate: 1_700_259_200_000,
    rollover: true,
    isActive: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.categoryId).toBe(sampleRaw.categoryId);
    expect(entity.amount).toBe(sampleRaw.amount);
    expect(entity.currency).toBe(sampleRaw.currency);
    expect(entity.period).toBe('monthly');
    expect(entity.startDate).toBe(sampleRaw.startDate);
    expect(entity.endDate).toBe(sampleRaw.endDate);
    expect(entity.rollover).toBe(sampleRaw.rollover);
    expect(entity.isActive).toBe(sampleRaw.isActive);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should preserve null categoryId in toDomain', () => {
    const raw: BudgetRaw = {...sampleRaw, categoryId: null};
    expect(toDomain(raw).categoryId).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.categoryId).toBe(sampleEntity.categoryId);
    expect(raw.period).toBe(sampleEntity.period);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip with overall budget (null category)', () => {
    const entity: Budget = {...sampleEntity, categoryId: null};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
