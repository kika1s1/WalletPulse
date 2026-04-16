import {
  generateStatementHtml,
  computeStatementSummary,
  computeCategoryBreakdown,
  type StatementInput,
} from '@domain/usecases/generate-statement';
import type {Transaction} from '@domain/entities/Transaction';

function makeTx(overrides: Partial<Transaction> & {amount: number; type: Transaction['type']}): Transaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 10),
    walletId: 'w-1',
    categoryId: 'cat-food',
    currency: 'USD',
    description: 'Test transaction',
    merchant: 'Test Merchant',
    source: 'manual',
    sourceHash: '',
    tags: [],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const baseInput: StatementInput = {
  user: {fullName: 'John Doe', email: 'john@example.com', address: '123 Main St\nLagos, Nigeria'},
  wallet: {name: 'Main Account', currency: 'USD'},
  transactions: [],
  categoryMap: {'cat-food': 'Food & Dining', 'cat-salary': 'Salary', 'cat-transport': 'Transport'},
  dateRange: {startMs: 1_699_900_000_000, endMs: 1_700_100_000_000},
  openingBalanceCents: 500000,
};

describe('computeStatementSummary', () => {
  it('returns zeros for empty transactions', () => {
    const result = computeStatementSummary([], 100000);
    expect(result.openingBalance).toBe(100000);
    expect(result.closingBalance).toBe(100000);
    expect(result.totalCredits).toBe(0);
    expect(result.totalDebits).toBe(0);
    expect(result.transactionCount).toBe(0);
  });

  it('calculates credits and debits correctly', () => {
    const txs = [
      makeTx({amount: 200000, type: 'income', categoryId: 'cat-salary'}),
      makeTx({amount: 5000, type: 'expense', categoryId: 'cat-food'}),
      makeTx({amount: 3000, type: 'expense', categoryId: 'cat-transport'}),
    ];
    const result = computeStatementSummary(txs, 100000);
    expect(result.totalCredits).toBe(200000);
    expect(result.totalDebits).toBe(8000);
    expect(result.closingBalance).toBe(100000 + 200000 - 8000);
    expect(result.transactionCount).toBe(3);
  });

  it('ignores transfer transactions', () => {
    const txs = [
      makeTx({amount: 10000, type: 'transfer'}),
    ];
    const result = computeStatementSummary(txs, 50000);
    expect(result.totalCredits).toBe(0);
    expect(result.totalDebits).toBe(0);
    expect(result.closingBalance).toBe(50000);
  });
});

describe('computeCategoryBreakdown', () => {
  it('returns empty array when no matching transactions', () => {
    const result = computeCategoryBreakdown([], 'expense', {});
    expect(result).toEqual([]);
  });

  it('groups expenses by category with percentages', () => {
    const txs = [
      makeTx({amount: 6000, type: 'expense', categoryId: 'cat-food'}),
      makeTx({amount: 4000, type: 'expense', categoryId: 'cat-transport'}),
    ];
    const map = {'cat-food': 'Food', 'cat-transport': 'Transport'};
    const result = computeCategoryBreakdown(txs, 'expense', map);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Food');
    expect(result[0].amount).toBe(6000);
    expect(result[0].percentage).toBeCloseTo(60, 0);
    expect(result[1].name).toBe('Transport');
    expect(result[1].percentage).toBeCloseTo(40, 0);
  });

  it('limits to top 5 categories', () => {
    const txs = Array.from({length: 7}, (_, i) =>
      makeTx({amount: (7 - i) * 1000, type: 'expense', categoryId: `cat-${i}`}),
    );
    const map = Object.fromEntries(Array.from({length: 7}, (_, i) => [`cat-${i}`, `Category ${i}`]));
    const result = computeCategoryBreakdown(txs, 'expense', map);
    expect(result).toHaveLength(5);
  });

  it('sorts by amount descending', () => {
    const txs = [
      makeTx({amount: 1000, type: 'expense', categoryId: 'cat-a'}),
      makeTx({amount: 5000, type: 'expense', categoryId: 'cat-b'}),
      makeTx({amount: 3000, type: 'expense', categoryId: 'cat-c'}),
    ];
    const map = {'cat-a': 'A', 'cat-b': 'B', 'cat-c': 'C'};
    const result = computeCategoryBreakdown(txs, 'expense', map);
    expect(result[0].name).toBe('B');
    expect(result[1].name).toBe('C');
    expect(result[2].name).toBe('A');
  });
});

describe('generateStatementHtml', () => {
  it('generates valid HTML document', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Account Statement');
  });

  it('includes account holder info', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('John Doe');
    expect(html).toContain('john@example.com');
    expect(html).toContain('123 Main St');
    expect(html).toContain('Lagos, Nigeria');
  });

  it('includes wallet and period info', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('Main Account');
    expect(html).toContain('USD');
  });

  it('includes opening and closing balance', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('Opening Balance');
    expect(html).toContain('Closing Balance');
    expect(html).toContain('USD 5000.00');
  });

  it('handles empty transactions gracefully', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('No transactions in this period');
  });

  it('renders transaction ledger rows', () => {
    const input: StatementInput = {
      ...baseInput,
      transactions: [
        makeTx({amount: 15000, type: 'income', categoryId: 'cat-salary', description: 'Monthly pay'}),
        makeTx({amount: 2500, type: 'expense', categoryId: 'cat-food', description: 'Lunch'}),
      ],
    };
    const html = generateStatementHtml(input);
    expect(html).toContain('Monthly pay');
    expect(html).toContain('Lunch');
    expect(html).toContain('Transaction Ledger');
    expect(html).not.toContain('No transactions in this period');
  });

  it('computes running balance correctly in the ledger', () => {
    const input: StatementInput = {
      ...baseInput,
      openingBalanceCents: 100000,
      transactions: [
        makeTx({amount: 50000, type: 'income', categoryId: 'cat-salary'}),
        makeTx({amount: 10000, type: 'expense', categoryId: 'cat-food'}),
      ],
    };
    const html = generateStatementHtml(input);
    expect(html).toContain('USD 1500.00');
    expect(html).toContain('USD 1400.00');
  });

  it('escapes HTML in user-provided fields', () => {
    const input: StatementInput = {
      ...baseInput,
      user: {fullName: '<script>alert("xss")</script>', email: 'x@y.com', address: ''},
    };
    const html = generateStatementHtml(input);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes category breakdown section', () => {
    const input: StatementInput = {
      ...baseInput,
      transactions: [
        makeTx({amount: 5000, type: 'expense', categoryId: 'cat-food'}),
        makeTx({amount: 20000, type: 'income', categoryId: 'cat-salary'}),
      ],
    };
    const html = generateStatementHtml(input);
    expect(html).toContain('Top Expenses');
    expect(html).toContain('Top Income');
    expect(html).toContain('Food &amp; Dining');
    expect(html).toContain('Salary');
  });

  it('includes confidential footer', () => {
    const html = generateStatementHtml(baseInput);
    expect(html).toContain('confidential');
    expect(html).toContain('WalletPulse');
  });

  it('omits address block when address is empty', () => {
    const input: StatementInput = {
      ...baseInput,
      user: {fullName: 'Jane', email: 'jane@x.com', address: ''},
    };
    const html = generateStatementHtml(input);
    const holderSection = html.slice(
      html.indexOf('Account Holder'),
      html.indexOf('Statement Details'),
    );
    expect(holderSection).toContain('Jane');
    expect(holderSection).toContain('jane@x.com');
    expect(holderSection).not.toContain('123 Main');
  });
});
