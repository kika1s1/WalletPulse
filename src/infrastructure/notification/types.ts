import type {TransactionType, TransactionSource} from '@domain/entities/Transaction';

export type RawNotification = {
  packageName: string;
  title: string;
  body: string;
  receivedAt: number;
};

export type ParsedNotification = {
  amountCents: number;
  currency: string;
  type: TransactionType;
  merchant: string;
  source: TransactionSource;
  confidence: number;
  description: string;
};

export type NotificationParser = (
  notification: RawNotification,
) => ParsedNotification | null;
