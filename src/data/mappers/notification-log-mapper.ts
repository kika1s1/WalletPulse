import type {NotificationLog} from '@domain/entities/NotificationLog';

export type NotificationLogRaw = {
  id: string;
  packageName: string;
  title: string;
  body: string;
  parsedSuccessfully: boolean;
  parseResult: string;
  transactionId: string | null;
  receivedAt: number;
  createdAt: number;
  updatedAt: number;
};

function nullToUndefined(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

export function toDomain(raw: NotificationLogRaw): NotificationLog {
  return {
    id: raw.id,
    packageName: raw.packageName,
    title: raw.title,
    body: raw.body,
    parsedSuccessfully: raw.parsedSuccessfully,
    parseResult: raw.parseResult,
    transactionId: nullToUndefined(raw.transactionId),
    receivedAt: raw.receivedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: NotificationLog): Omit<NotificationLogRaw, 'id'> {
  return {
    packageName: entity.packageName,
    title: entity.title,
    body: entity.body,
    parsedSuccessfully: entity.parsedSuccessfully,
    parseResult: entity.parseResult,
    transactionId: undefinedToNull(entity.transactionId),
    receivedAt: entity.receivedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
