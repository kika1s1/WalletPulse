import {LocalSearchIndex, resetLocalSearchIndexForTests} from '@infrastructure/search/LocalSearchIndex';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';
import type {Budget} from '@domain/entities/Budget';
import type {ParsedQuery} from '@domain/usecases/search/parseSearchQuery';

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't-1',
    walletId: 'w-1',
    categoryId: 'c-1',
    amount: 1000,
    currency: 'USD',
    type: 'expense',
    description: '',
    merchant: '',
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

function emptyParsed(overrides: Partial<ParsedQuery> = {}): ParsedQuery {
  return {text: '', negated: [], phrases: [], has: [], is: [], filters: {}, ...overrides};
}

beforeEach(() => {
  resetLocalSearchIndexForTests();
});

describe('LocalSearchIndex', () => {
  it('starts empty and reports size 0', () => {
    const idx = new LocalSearchIndex();
    expect(idx.size).toBe(0);
    const result = idx.search(emptyParsed({text: 'anything'}));
    expect(result.transactions).toHaveLength(0);
  });

  it('finds a transaction by merchant substring', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Uber Eats'}), tx({id: 't-2', merchant: 'Starbucks'})],
      [], [], [],
    );
    const result = idx.search(emptyParsed({text: 'uber'}));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-1']);
  });

  it('is diacritic-insensitive', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild([tx({id: 't-1', merchant: 'Café Olé'})], [], [], []);
    const result = idx.search(emptyParsed({text: 'cafe ole'}));
    expect(result.transactions).toHaveLength(1);
  });

  it('applies amount filter from parsed.filters', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Uber', amount: 500}),
        tx({id: 't-2', merchant: 'Uber', amount: 5000})],
      [], [], [],
    );
    const result = idx.search(emptyParsed({
      text: 'uber',
      filters: {minAmount: 1000},
    }));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-2']);
  });

  it('applies tags contains filter', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Amazon', tags: ['work', 'refundable']}),
       tx({id: 't-2', merchant: 'Amazon', tags: ['personal']})],
      [], [], [],
    );
    const result = idx.search(emptyParsed({
      text: 'amazon',
      filters: {tags: ['work']},
    }));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-1']);
  });

  it('honours has:receipt', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Acme', receiptUri: 'file://r.jpg'}),
       tx({id: 't-2', merchant: 'Acme', receiptUri: ''})],
      [], [], [],
    );
    const result = idx.search(emptyParsed({
      text: 'acme',
      has: ['receipt'],
    }));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-1']);
  });

  it('honours negations', async () => {
    const idx = new LocalSearchIndex();
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Uber Eats'}),
       tx({id: 't-2', merchant: 'Uber Pool'})],
      [], [], [],
    );
    const result = idx.search(emptyParsed({
      text: 'uber',
      negated: ['pool'],
    }));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-1']);
  });

  it('returns wallet + category + budget matches alongside transactions', async () => {
    const idx = new LocalSearchIndex();
    const wallet: Wallet = {
      id: 'w-1', currency: 'USD', name: 'Chase Checking', balance: 0,
      isActive: true, icon: '', color: '', sortOrder: 0,
      createdAt: 0, updatedAt: 0,
    };
    const category: Category = {
      id: 'c-1', name: 'Groceries', icon: '', color: '#000',
      type: 'expense', isDefault: false, isArchived: false,
      sortOrder: 0, createdAt: 0, updatedAt: 0,
    };
    const budget: Budget = {
      id: 'b-1', categoryId: null, amount: 10000, currency: 'USD',
      period: 'monthly', startDate: 0, endDate: 0, rollover: false,
      isActive: true, createdAt: 0, updatedAt: 0,
    };
    await idx.rebuild(
      [tx({id: 't-1', merchant: 'Chase', description: ''})],
      [wallet], [category], [budget],
    );
    const result = idx.search(emptyParsed({text: 'chase'}));
    expect(result.transactions).toHaveLength(1);
    expect(result.wallets.map((r) => r.id)).toEqual(['w-1']);
  });

  it('evicts older transactions beyond the MAX cap (LRU by date)', async () => {
    const idx = new LocalSearchIndex();
    // Build 5001 transactions with ascending dates; the oldest should be
    // evicted so that only the most-recent 5000 remain.
    const txs = Array.from({length: 5001}, (_, i) =>
      tx({id: `t-${i}`, merchant: `Merchant ${i}`, transactionDate: 1_000_000 + i}),
    );
    await idx.rebuild(txs, [], [], []);
    expect(idx.size).toBe(5000);
    // The earliest merchant should NOT be searchable; the latest should.
    const oldResult = idx.search(emptyParsed({text: 'Merchant 0'}));
    const newResult = idx.search(emptyParsed({text: 'Merchant 5000'}));
    expect(oldResult.transactions.find((r) => r.id === 't-0')).toBeUndefined();
    expect(newResult.transactions.find((r) => r.id === 't-5000')).toBeDefined();
  });

  it('persists across rebuild + hydrate roundtrip', async () => {
    const a = new LocalSearchIndex();
    await a.rebuild([tx({id: 't-1', merchant: 'Persist Me'})], [], [], []);
    const b = new LocalSearchIndex();
    await b.hydrate();
    const result = b.search(emptyParsed({text: 'persist'}));
    expect(result.transactions.map((r) => r.id)).toEqual(['t-1']);
  });
});
