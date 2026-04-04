import {toDomain, toRaw, type BillReminderRaw} from '@data/mappers/bill-reminder-mapper';
import type {BillReminder} from '@domain/entities/BillReminder';

describe('bill-reminder-mapper', () => {
  const sampleEntity: BillReminder = {
    id: 'bill-1',
    name: 'Rent',
    amount: 120_000,
    currency: 'ETB',
    dueDate: 1_720_000_000_000,
    recurrence: 'monthly',
    categoryId: 'cat-housing',
    isPaid: false,
    paidTransactionId: 'txn-paid-1',
    remindDaysBefore: 3,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: BillReminderRaw = {
    id: 'bill-1',
    name: 'Rent',
    amount: 120_000,
    currency: 'ETB',
    dueDate: 1_720_000_000_000,
    recurrence: 'monthly',
    categoryId: 'cat-housing',
    isPaid: false,
    paidTransactionId: 'txn-paid-1',
    remindDaysBefore: 3,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity.id).toBe(sampleRaw.id);
    expect(entity.name).toBe(sampleRaw.name);
    expect(entity.amount).toBe(sampleRaw.amount);
    expect(entity.currency).toBe(sampleRaw.currency);
    expect(entity.dueDate).toBe(sampleRaw.dueDate);
    expect(entity.recurrence).toBe('monthly');
    expect(entity.categoryId).toBe(sampleRaw.categoryId);
    expect(entity.isPaid).toBe(sampleRaw.isPaid);
    expect(entity.paidTransactionId).toBe('txn-paid-1');
    expect(entity.remindDaysBefore).toBe(sampleRaw.remindDaysBefore);
    expect(entity.createdAt).toBe(sampleRaw.createdAt);
    expect(entity.updatedAt).toBe(sampleRaw.updatedAt);
  });

  it('should convert null paidTransactionId to undefined in toDomain', () => {
    const raw: BillReminderRaw = {...sampleRaw, paidTransactionId: null};
    expect(toDomain(raw).paidTransactionId).toBeUndefined();
  });

  it('should convert undefined paidTransactionId to null in toRaw', () => {
    const entity: BillReminder = {...sampleEntity, paidTransactionId: undefined};
    expect(toRaw(entity).paidTransactionId).toBeNull();
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw.recurrence).toBe(sampleEntity.recurrence);
    expect(raw.paidTransactionId).toBe(sampleEntity.paidTransactionId ?? null);
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });

  it('should handle round-trip without paidTransactionId', () => {
    const entity: BillReminder = {...sampleEntity, paidTransactionId: undefined};
    const raw = toRaw(entity);
    const back = toDomain({id: entity.id, ...raw});
    expect(back).toEqual(entity);
  });
});
