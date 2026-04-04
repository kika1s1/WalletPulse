import type {BillRecurrence, BillReminder} from '@domain/entities/BillReminder';

export type BillReminderRaw = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: number;
  recurrence: string;
  categoryId: string;
  isPaid: boolean;
  paidTransactionId: string | null;
  remindDaysBefore: number;
  createdAt: number;
  updatedAt: number;
};

function nullToUndefined(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

export function toDomain(raw: BillReminderRaw): BillReminder {
  return {
    id: raw.id,
    name: raw.name,
    amount: raw.amount,
    currency: raw.currency,
    dueDate: raw.dueDate,
    recurrence: raw.recurrence as BillRecurrence,
    categoryId: raw.categoryId,
    isPaid: raw.isPaid,
    paidTransactionId: nullToUndefined(raw.paidTransactionId),
    remindDaysBefore: raw.remindDaysBefore,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: BillReminder): Omit<BillReminderRaw, 'id'> {
  return {
    name: entity.name,
    amount: entity.amount,
    currency: entity.currency,
    dueDate: entity.dueDate,
    recurrence: entity.recurrence,
    categoryId: entity.categoryId,
    isPaid: entity.isPaid,
    paidTransactionId: undefinedToNull(entity.paidTransactionId),
    remindDaysBefore: entity.remindDaysBefore,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
