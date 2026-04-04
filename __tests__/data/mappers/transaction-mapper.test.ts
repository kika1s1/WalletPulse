import {toDomain, toRaw, type TransactionRaw} from '@data/mappers/transaction-mapper';
import type {Transaction} from '@domain/entities/Transaction';

describe('transaction-mapper', () => {
  const sampleEntity: Transaction = {
    id: 'txn-1',
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    amount: 2500,
    currency: 'USD',
    type: 'expense',
    description: 'Coffee',
    merchant: 'Cafe',
    source: 'manual',
    sourceHash: 'hash-1',
    tags: ['food', 'work'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    locationLat: 9.03,
    locationLng: 38.75,
    locationName: 'Addis',
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: 1_704_000_000_000,
    createdAt: 1_704_000_000_000,
    updatedAt: 1_704_000_100_000,
  };

  const sampleRaw: TransactionRaw = {
    id: 'txn-1',
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    amount: 2500,
    currency: 'USD',
    type: 'expense',
    description: 'Coffee',
    merchant: 'Cafe',
    source: 'manual',
    sourceHash: 'hash-1',
    tags: '["food","work"]',
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    locationLat: 9.03,
    locationLng: 38.75,
    locationName: 'Addis',
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: 1_704_000_000_000,
    createdAt: 1_704_000_000_000,
    updatedAt: 1_704_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.walletId).toBe(sampleRaw.walletId);
    expect(entity.categoryId).toBe(sampleRaw.categoryId);
    expect(entity.amount).toBe(sampleRaw.amount);
    expect(entity.currency).toBe(sampleRaw.currency);
    expect(entity.type).toBe('expense');
    expect(entity.description).toBe(sampleRaw.description);
    expect(entity.merchant).toBe(sampleRaw.merchant);
    expect(entity.source).toBe('manual');
    expect(entity.sourceHash).toBe(sampleRaw.sourceHash);
    expect(entity.tags).toEqual(['food', 'work']);
    expect(entity.receiptUri).toBe(sampleRaw.receiptUri);
    expect(entity.isRecurring).toBe(sampleRaw.isRecurring);
    expect(entity.recurrenceRule).toBe(sampleRaw.recurrenceRule);
    expect(entity.confidence).toBe(sampleRaw.confidence);
    expect(entity.locationLat).toBe(9.03);
    expect(entity.locationLng).toBe(38.75);
    expect(entity.locationName).toBe('Addis');
    expect(entity.notes).toBe(sampleRaw.notes);
    expect(entity.isTemplate).toBe(sampleRaw.isTemplate);
    expect(entity.templateName).toBe(sampleRaw.templateName);
    expect(entity.transactionDate).toBe(sampleRaw.transactionDate);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.walletId).toBe(sampleEntity.walletId);
    expect(raw.categoryId).toBe(sampleEntity.categoryId);
    expect(raw.amount).toBe(sampleEntity.amount);
    expect(raw.currency).toBe(sampleEntity.currency);
    expect(raw.type).toBe(sampleEntity.type);
    expect(raw.description).toBe(sampleEntity.description);
    expect(raw.merchant).toBe(sampleEntity.merchant);
    expect(raw.source).toBe(sampleEntity.source);
    expect(raw.sourceHash).toBe(sampleEntity.sourceHash);
    expect(raw.tags).toBe(JSON.stringify(sampleEntity.tags));
    expect(raw.receiptUri).toBe(sampleEntity.receiptUri);
    expect(raw.isRecurring).toBe(sampleEntity.isRecurring);
    expect(raw.recurrenceRule).toBe(sampleEntity.recurrenceRule);
    expect(raw.confidence).toBe(sampleEntity.confidence);
    expect(raw.locationLat).toBe(sampleEntity.locationLat);
    expect(raw.locationLng).toBe(sampleEntity.locationLng);
    expect(raw.locationName).toBe(sampleEntity.locationName);
    expect(raw.notes).toBe(sampleEntity.notes);
    expect(raw.isTemplate).toBe(sampleEntity.isTemplate);
    expect(raw.templateName).toBe(sampleEntity.templateName);
    expect(raw.transactionDate).toBe(sampleEntity.transactionDate);
    expect(raw.createdAt).toBe(sampleEntity.createdAt);
    expect(raw.updatedAt).toBe(sampleEntity.updatedAt);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should parse tags JSON to string array in toDomain', () => {
    const raw: TransactionRaw = {
      ...sampleRaw,
      tags: '["a","b","c"]',
    };
    expect(toDomain(raw).tags).toEqual(['a', 'b', 'c']);
  });

  it('should stringify tags in toRaw', () => {
    const entity: Transaction = {...sampleEntity, tags: ['x', 'y']};
    expect(toRaw(entity).tags).toBe('["x","y"]');
  });

  it('should map null location fields to undefined in toDomain', () => {
    const raw: TransactionRaw = {
      ...sampleRaw,
      locationLat: null,
      locationLng: null,
      locationName: null,
    };
    const entity = toDomain(raw);
    expect(entity.locationLat).toBeUndefined();
    expect(entity.locationLng).toBeUndefined();
    expect(entity.locationName).toBeUndefined();
  });

  it('should map undefined location fields to null in toRaw', () => {
    const entity: Transaction = {
      ...sampleEntity,
      locationLat: undefined,
      locationLng: undefined,
      locationName: undefined,
    };
    const raw = toRaw(entity);
    expect(raw.locationLat).toBeNull();
    expect(raw.locationLng).toBeNull();
    expect(raw.locationName).toBeNull();
  });

  it('should serialize empty tags as "[]"', () => {
    const entity: Transaction = {...sampleEntity, tags: []};
    expect(toRaw(entity).tags).toBe('[]');
    expect(toDomain({...sampleRaw, tags: '[]'}).tags).toEqual([]);
  });
});
