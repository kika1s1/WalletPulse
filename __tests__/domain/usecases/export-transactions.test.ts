import {
  formatTransactionsAsCsv,
  formatTransactionsAsJson,
  buildExportFilename,
  type ExportFormat,
} from '@domain/usecases/export-transactions';
import type {Transaction} from '@domain/entities/Transaction';

const now = Date.now();

const txns: Transaction[] = [
  {
    id: 'txn-1',
    walletId: 'w1',
    categoryId: 'food',
    amount: 1299,
    currency: 'USD',
    type: 'expense',
    description: 'Lunch',
    merchant: 'Cafe',
    source: 'manual',
    sourceHash: '',
    tags: ['food', 'team'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: 'Team lunch',
    isTemplate: false,
    templateName: '',
    transactionDate: now - 86400000,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'txn-2',
    walletId: 'w1',
    categoryId: 'salary',
    amount: 500000,
    currency: 'USD',
    type: 'income',
    description: 'Monthly salary',
    merchant: 'Employer',
    source: 'payoneer',
    sourceHash: 'p1',
    tags: ['payroll'],
    receiptUri: '',
    isRecurring: true,
    recurrenceRule: 'MONTHLY',
    confidence: 0.95,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: now,
    createdAt: now,
    updatedAt: now,
  },
];

describe('export-transactions', () => {
  describe('formatTransactionsAsCsv', () => {
    it('produces valid CSV with header row', () => {
      const csv = formatTransactionsAsCsv(txns);
      const lines = csv.split('\n');
      expect(lines[0]).toContain('Date');
      expect(lines[0]).toContain('Amount');
      expect(lines[0]).toContain('Currency');
      expect(lines[0]).toContain('Type');
      expect(lines.length).toBe(3);
    });

    it('formats amounts as major units', () => {
      const csv = formatTransactionsAsCsv(txns);
      expect(csv).toContain('12.99');
      expect(csv).toContain('5000.00');
    });

    it('escapes commas and quotes in fields', () => {
      const special: Transaction[] = [
        {
          ...txns[0],
          description: 'Lunch, with "friends"',
          merchant: 'Cafe, Inc.',
        },
      ];
      const csv = formatTransactionsAsCsv(special);
      expect(csv).toContain('"Lunch, with ""friends"""');
      expect(csv).toContain('"Cafe, Inc."');
    });

    it('returns header only for empty transactions', () => {
      const csv = formatTransactionsAsCsv([]);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Date');
    });

    it('joins tags with semicolons', () => {
      const csv = formatTransactionsAsCsv(txns);
      expect(csv).toContain('food;team');
    });
  });

  describe('formatTransactionsAsJson', () => {
    it('produces valid JSON array', () => {
      const json = formatTransactionsAsJson(txns);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('converts amounts to major units', () => {
      const json = formatTransactionsAsJson(txns);
      const parsed = JSON.parse(json);
      expect(parsed[0].amount).toBe(12.99);
    });

    it('includes all relevant fields', () => {
      const json = formatTransactionsAsJson(txns);
      const parsed = JSON.parse(json);
      const first = parsed[0];
      expect(first).toHaveProperty('date');
      expect(first).toHaveProperty('amount');
      expect(first).toHaveProperty('currency');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('merchant');
      expect(first).toHaveProperty('tags');
      expect(first).toHaveProperty('notes');
    });

    it('returns empty array for empty input', () => {
      const json = formatTransactionsAsJson([]);
      expect(JSON.parse(json)).toEqual([]);
    });
  });

  describe('buildExportFilename', () => {
    it('builds CSV filename with date', () => {
      const name = buildExportFilename('csv');
      expect(name).toMatch(/^walletpulse-export-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('builds JSON filename with date', () => {
      const name = buildExportFilename('json');
      expect(name).toMatch(/^walletpulse-export-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });
});
