import {toDomain, toRaw, type SubscriptionRaw} from '@data/mappers/subscription-mapper';
import type {Subscription} from '@domain/entities/Subscription';

describe('subscription-mapper', () => {
  const sampleEntity: Subscription = {
    id: 'sub-1',
    name: 'Streaming',
    amount: 999,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: 1_710_000_000_000,
    categoryId: 'cat-1',
    isActive: true,
    cancelledAt: 1_705_000_000_000,
    icon: 'tv',
    color: '#aa00ff',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: SubscriptionRaw = {
    id: 'sub-1',
    name: 'Streaming',
    amount: 999,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: 1_710_000_000_000,
    categoryId: 'cat-1',
    isActive: true,
    cancelledAt: 1_705_000_000_000,
    icon: 'tv',
    color: '#aa00ff',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.name).toBe(sampleRaw.name);
    expect(entity.amount).toBe(sampleRaw.amount);
    expect(entity.currency).toBe(sampleRaw.currency);
    expect(entity.billingCycle).toBe('monthly');
    expect(entity.nextDueDate).toBe(sampleRaw.nextDueDate);
    expect(entity.categoryId).toBe(sampleRaw.categoryId);
    expect(entity.isActive).toBe(sampleRaw.isActive);
    expect(entity.cancelledAt).toBe(sampleRaw.cancelledAt);
    expect(entity.icon).toBe(sampleRaw.icon);
    expect(entity.color).toBe(sampleRaw.color);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert null cancelledAt to undefined in toDomain', () => {
    const raw: SubscriptionRaw = {...sampleRaw, cancelledAt: null};
    expect(toDomain(raw).cancelledAt).toBeUndefined();
  });

  it('should convert undefined cancelledAt to null in toRaw', () => {
    const entity: Subscription = {...sampleEntity, cancelledAt: undefined};
    expect(toRaw(entity).cancelledAt).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.billingCycle).toBe(sampleEntity.billingCycle);
    expect(raw.cancelledAt).toBe(sampleEntity.cancelledAt ?? null);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip without cancelledAt', () => {
    const entity: Subscription = {...sampleEntity, cancelledAt: undefined};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
