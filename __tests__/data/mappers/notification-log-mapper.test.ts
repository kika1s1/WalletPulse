import {toDomain, toRaw, type NotificationLogRaw} from '@data/mappers/notification-log-mapper';
import type {NotificationLog} from '@domain/entities/NotificationLog';

describe('notification-log-mapper', () => {
  const sampleEntity: NotificationLog = {
    id: 'nl-1',
    packageName: 'com.payoneer.app',
    title: 'Payment received',
    body: 'You received 100 USD',
    parsedSuccessfully: true,
    parseResult: '{"amount":10000}',
    transactionId: 'txn-from-notif',
    receivedAt: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: NotificationLogRaw = {
    id: 'nl-1',
    packageName: 'com.payoneer.app',
    title: 'Payment received',
    body: 'You received 100 USD',
    parsedSuccessfully: true,
    parseResult: '{"amount":10000}',
    transactionId: 'txn-from-notif',
    receivedAt: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.packageName).toBe(sampleRaw.packageName);
    expect(entity.title).toBe(sampleRaw.title);
    expect(entity.body).toBe(sampleRaw.body);
    expect(entity.parsedSuccessfully).toBe(sampleRaw.parsedSuccessfully);
    expect(entity.parseResult).toBe(sampleRaw.parseResult);
    expect(entity.transactionId).toBe('txn-from-notif');
    expect(entity.receivedAt).toBe(sampleRaw.receivedAt);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert null transactionId to undefined in toDomain', () => {
    const raw: NotificationLogRaw = {...sampleRaw, transactionId: null};
    expect(toDomain(raw).transactionId).toBeUndefined();
  });

  it('should convert undefined transactionId to null in toRaw', () => {
    const entity: NotificationLog = {...sampleEntity, transactionId: undefined};
    expect(toRaw(entity).transactionId).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.transactionId).toBe(sampleEntity.transactionId ?? null);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip without transactionId', () => {
    const entity: NotificationLog = {...sampleEntity, transactionId: undefined};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
