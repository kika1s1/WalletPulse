import type {Transaction, TransactionSource, TransactionType} from '@domain/entities/Transaction';

export type TransactionRaw = {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
  merchant: string;
  source: string;
  sourceHash: string;
  tags: string;
  receiptUri: string;
  isRecurring: boolean;
  recurrenceRule: string;
  confidence: number;
  locationLat: number | null;
  locationLng: number | null;
  locationName: string | null;
  notes: string;
  isTemplate: boolean;
  templateName: string;
  transactionDate: number;
  createdAt: number;
  updatedAt: number;
};

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function parseTagsJson(tagsJson: string): string[] {
  const parsed = JSON.parse(tagsJson) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map(String);
}

export function toDomain(raw: TransactionRaw): Transaction {
  return {
    id: raw.id,
    walletId: raw.walletId,
    categoryId: raw.categoryId,
    amount: raw.amount,
    currency: raw.currency,
    type: raw.type as TransactionType,
    description: raw.description,
    merchant: raw.merchant,
    source: raw.source as TransactionSource,
    sourceHash: raw.sourceHash,
    tags: parseTagsJson(raw.tags),
    receiptUri: raw.receiptUri,
    isRecurring: raw.isRecurring,
    recurrenceRule: raw.recurrenceRule,
    confidence: raw.confidence,
    locationLat: nullToUndefined(raw.locationLat),
    locationLng: nullToUndefined(raw.locationLng),
    locationName: nullToUndefined(raw.locationName),
    notes: raw.notes,
    isTemplate: raw.isTemplate,
    templateName: raw.templateName,
    transactionDate: raw.transactionDate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Transaction): Omit<TransactionRaw, 'id'> {
  return {
    walletId: entity.walletId,
    categoryId: entity.categoryId,
    amount: entity.amount,
    currency: entity.currency,
    type: entity.type,
    description: entity.description,
    merchant: entity.merchant,
    source: entity.source,
    sourceHash: entity.sourceHash,
    tags: JSON.stringify(entity.tags),
    receiptUri: entity.receiptUri,
    isRecurring: entity.isRecurring,
    recurrenceRule: entity.recurrenceRule,
    confidence: entity.confidence,
    locationLat: undefinedToNull(entity.locationLat),
    locationLng: undefinedToNull(entity.locationLng),
    locationName: undefinedToNull(entity.locationName),
    notes: entity.notes,
    isTemplate: entity.isTemplate,
    templateName: entity.templateName,
    transactionDate: entity.transactionDate,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
