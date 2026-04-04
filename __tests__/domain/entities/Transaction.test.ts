import {
  createTransaction,
  isAutoDetected,
  isExpense,
  isIncome,
  type CreateTransactionInput,
} from '@domain/entities/Transaction';

const baseInput: CreateTransactionInput = {
  id: 'txn-1',
  walletId: 'wallet-1',
  categoryId: 'cat-1',
  amount: 2500,
  currency: 'USD',
  type: 'expense',
  source: 'manual',
  transactionDate: 1_704_000_000_000,
  createdAt: 1_704_000_000_000,
  updatedAt: 1_704_000_000_000,
};

describe('Transaction entity', () => {
  describe('createTransaction', () => {
    it('creates a valid manual transaction with defaults for optional fields', () => {
      const t = createTransaction(baseInput);

      expect(t.id).toBe('txn-1');
      expect(t.walletId).toBe('wallet-1');
      expect(t.categoryId).toBe('cat-1');
      expect(t.amount).toBe(2500);
      expect(t.currency).toBe('USD');
      expect(t.type).toBe('expense');
      expect(t.source).toBe('manual');
      expect(t.description).toBe('');
      expect(t.merchant).toBe('');
      expect(t.sourceHash).toBe('');
      expect(t.tags).toEqual([]);
      expect(t.receiptUri).toBe('');
      expect(t.isRecurring).toBe(false);
      expect(t.recurrenceRule).toBe('');
      expect(t.confidence).toBe(1);
      expect(t.notes).toBe('');
      expect(t.isTemplate).toBe(false);
      expect(t.templateName).toBe('');
      expect(t.transactionDate).toBe(1_704_000_000_000);
      expect(t.createdAt).toBe(1_704_000_000_000);
      expect(t.updatedAt).toBe(1_704_000_000_000);
    });

    it('creates a valid auto-detected transaction with optional fields', () => {
      const t = createTransaction({
        ...baseInput,
        id: 'txn-2',
        type: 'income',
        source: 'grey',
        description: 'Incoming payment',
        merchant: 'Client A',
        sourceHash: 'abc123',
        tags: ['freelance'],
        receiptUri: 'file:///receipt.jpg',
        isRecurring: true,
        recurrenceRule: 'FREQ=MONTHLY',
        confidence: 0.92,
        locationLat: 9.03,
        locationLng: 38.75,
        locationName: 'Addis Ababa',
        notes: 'Verified',
        isTemplate: false,
        templateName: '',
      });

      expect(t.source).toBe('grey');
      expect(t.description).toBe('Incoming payment');
      expect(t.merchant).toBe('Client A');
      expect(t.sourceHash).toBe('abc123');
      expect(t.tags).toEqual(['freelance']);
      expect(t.confidence).toBe(0.92);
      expect(t.locationLat).toBe(9.03);
      expect(t.locationLng).toBe(38.75);
      expect(t.locationName).toBe('Addis Ababa');
    });

    it('normalizes currency to uppercase', () => {
      const t = createTransaction({...baseInput, currency: 'eur'});
      expect(t.currency).toBe('EUR');
    });

    it('trims wallet and category ids', () => {
      const t = createTransaction({
        ...baseInput,
        walletId: '  wallet-1  ',
        categoryId: '  cat-1  ',
      });
      expect(t.walletId).toBe('wallet-1');
      expect(t.categoryId).toBe('cat-1');
    });

    it('rejects amount zero', () => {
      expect(() => createTransaction({...baseInput, amount: 0})).toThrow(
        'Amount must be positive (cents)',
      );
    });

    it('rejects negative amount', () => {
      expect(() => createTransaction({...baseInput, amount: -100})).toThrow(
        'Amount must be positive (cents)',
      );
    });

    it('rejects non-finite amount', () => {
      expect(() => createTransaction({...baseInput, amount: Number.NaN})).toThrow(
        'Amount must be positive (cents)',
      );
    });

    it('rejects empty wallet id', () => {
      expect(() => createTransaction({...baseInput, walletId: ''})).toThrow(
        'Wallet id is required',
      );
    });

    it('rejects whitespace-only wallet id', () => {
      expect(() => createTransaction({...baseInput, walletId: '   '})).toThrow(
        'Wallet id is required',
      );
    });

    it('rejects empty category id', () => {
      expect(() => createTransaction({...baseInput, categoryId: ''})).toThrow(
        'Category id is required',
      );
    });

    it('rejects invalid transaction type at runtime', () => {
      expect(() =>
        createTransaction({...baseInput, type: 'refund' as CreateTransactionInput['type']}),
      ).toThrow('Invalid transaction type');
    });

    it('rejects currency code that is not exactly three letters', () => {
      expect(() => createTransaction({...baseInput, currency: 'US'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
      expect(() => createTransaction({...baseInput, currency: 'USDD'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
      expect(() => createTransaction({...baseInput, currency: 'US1'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
    });

    it('rejects non-positive transaction date', () => {
      expect(() => createTransaction({...baseInput, transactionDate: 0})).toThrow(
        'Transaction date must be a positive timestamp',
      );
      expect(() => createTransaction({...baseInput, transactionDate: -1})).toThrow(
        'Transaction date must be a positive timestamp',
      );
    });
  });

  describe('isAutoDetected', () => {
    it('returns true when source is payoneer', () => {
      const t = createTransaction({...baseInput, source: 'payoneer'});
      expect(isAutoDetected(t)).toBe(true);
    });

    it('returns false when source is manual', () => {
      const t = createTransaction(baseInput);
      expect(isAutoDetected(t)).toBe(false);
    });
  });

  describe('isExpense / isIncome', () => {
    it('isExpense is true only for expense type', () => {
      expect(isExpense(createTransaction({...baseInput, type: 'expense'}))).toBe(true);
      expect(isExpense(createTransaction({...baseInput, type: 'income'}))).toBe(false);
      expect(isExpense(createTransaction({...baseInput, type: 'transfer'}))).toBe(false);
    });

    it('isIncome is true only for income type', () => {
      expect(isIncome(createTransaction({...baseInput, type: 'income'}))).toBe(true);
      expect(isIncome(createTransaction({...baseInput, type: 'expense'}))).toBe(false);
      expect(isIncome(createTransaction({...baseInput, type: 'transfer'}))).toBe(false);
    });
  });
});
