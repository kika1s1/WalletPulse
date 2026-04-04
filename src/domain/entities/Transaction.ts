export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionSource = 'manual' | 'payoneer' | 'grey' | 'dukascopy';

export type Transaction = {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description: string;
  merchant: string;
  source: TransactionSource;
  sourceHash: string;
  tags: string[];
  receiptUri: string;
  isRecurring: boolean;
  recurrenceRule: string;
  confidence: number;
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  notes: string;
  isTemplate: boolean;
  templateName: string;
  transactionDate: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateTransactionInput = {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description?: string;
  merchant?: string;
  source: TransactionSource;
  sourceHash?: string;
  tags?: string[];
  receiptUri?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  confidence?: number;
  locationLat?: number;
  locationLng?: number;
  locationName?: string;
  notes?: string;
  isTemplate?: boolean;
  templateName?: string;
  transactionDate: number;
  createdAt: number;
  updatedAt: number;
};

const VALID_TYPES: readonly TransactionType[] = ['income', 'expense', 'transfer'];

function isThreeLetterIsoCurrency(code: string): boolean {
  return code.length === 3 && /^[A-Za-z]{3}$/.test(code);
}

export function createTransaction(input: CreateTransactionInput): Transaction {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be positive (cents)');
  }
  if (!input.walletId.trim()) {
    throw new Error('Wallet id is required');
  }
  if (!input.categoryId.trim()) {
    throw new Error('Category id is required');
  }
  if (!VALID_TYPES.includes(input.type)) {
    throw new Error('Invalid transaction type');
  }
  if (!isThreeLetterIsoCurrency(input.currency)) {
    throw new Error('Currency must be a 3-letter ISO code');
  }
  if (input.transactionDate <= 0) {
    throw new Error('Transaction date must be a positive timestamp');
  }

  return {
    id: input.id,
    walletId: input.walletId.trim(),
    categoryId: input.categoryId.trim(),
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    type: input.type,
    description: input.description ?? '',
    merchant: input.merchant ?? '',
    source: input.source,
    sourceHash: input.sourceHash ?? '',
    tags: input.tags ?? [],
    receiptUri: input.receiptUri ?? '',
    isRecurring: input.isRecurring ?? false,
    recurrenceRule: input.recurrenceRule ?? '',
    confidence: input.confidence ?? 1,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    locationName: input.locationName,
    notes: input.notes ?? '',
    isTemplate: input.isTemplate ?? false,
    templateName: input.templateName ?? '',
    transactionDate: input.transactionDate,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function isAutoDetected(t: Transaction): boolean {
  return t.source !== 'manual';
}

export function isExpense(t: Transaction): boolean {
  return t.type === 'expense';
}

export function isIncome(t: Transaction): boolean {
  return t.type === 'income';
}
