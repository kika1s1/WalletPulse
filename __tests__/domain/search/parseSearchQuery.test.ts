import {parseSearchQuery, type ResolveCtx} from '@domain/usecases/search/parseSearchQuery';

const ctx: ResolveCtx = {
  wallets: [
    {id: 'w1', name: 'GTB Main', currency: 'NGN'},
    {id: 'w2', name: 'Chase Checking', currency: 'USD'},
  ],
  categories: [
    {id: 'c1', name: 'Food', type: 'expense'},
    {id: 'c2', name: 'Salary', type: 'income'},
    {id: 'c3', name: 'Transport', type: 'expense'},
  ],
  // Today is 2026-04-23 per the task metadata.
  now: new Date('2026-04-23T12:00:00Z').getTime(),
  timezoneOffsetMinutes: 0,
};

describe('parseSearchQuery', () => {
  describe('free text', () => {
    it('returns free text when no operators are present', () => {
      expect(parseSearchQuery('uber eats', ctx)).toMatchObject({
        text: 'uber eats',
        filters: {},
        negated: [],
        phrases: [],
      });
    });

    it('trims and collapses whitespace', () => {
      expect(parseSearchQuery('   uber    eats   ', ctx).text).toBe('uber eats');
    });

    it('returns empty for empty input', () => {
      expect(parseSearchQuery('', ctx)).toEqual({
        text: '', filters: {}, negated: [], phrases: [],
      });
    });

    it('extracts quoted phrases', () => {
      const p = parseSearchQuery('"monthly rent" utilities', ctx);
      expect(p.phrases).toEqual(['monthly rent']);
      expect(p.text).toBe('utilities');
    });

    it('extracts negated terms', () => {
      const p = parseSearchQuery('food -uber -starbucks', ctx);
      expect(p.negated).toEqual(['uber', 'starbucks']);
      expect(p.text).toBe('food');
    });
  });

  describe('amount operator', () => {
    it('parses greater-than', () => {
      const p = parseSearchQuery('amount:>50', ctx);
      expect(p.filters.minAmount).toBe(5001); // exclusive >50 -> >=50.01 in cents
    });

    it('parses greater-or-equal', () => {
      const p = parseSearchQuery('amount:>=50', ctx);
      expect(p.filters.minAmount).toBe(5000);
    });

    it('parses less-than', () => {
      const p = parseSearchQuery('amount:<20', ctx);
      expect(p.filters.maxAmount).toBe(1999);
    });

    it('parses less-or-equal', () => {
      const p = parseSearchQuery('amount:<=20', ctx);
      expect(p.filters.maxAmount).toBe(2000);
    });

    it('parses a range', () => {
      const p = parseSearchQuery('amount:10..50', ctx);
      expect(p.filters.minAmount).toBe(1000);
      expect(p.filters.maxAmount).toBe(5000);
    });

    it('parses an equality shorthand (amount:25)', () => {
      const p = parseSearchQuery('amount:25', ctx);
      expect(p.filters.minAmount).toBe(2500);
      expect(p.filters.maxAmount).toBe(2500);
    });

    it('handles decimals', () => {
      const p = parseSearchQuery('amount:>=10.50', ctx);
      expect(p.filters.minAmount).toBe(1050);
    });

    it('handles thousand separators', () => {
      const p = parseSearchQuery('amount:>=1,234.56', ctx);
      expect(p.filters.minAmount).toBe(123456);
    });

    it('ignores malformed amounts and keeps them as free text', () => {
      const p = parseSearchQuery('amount:abc', ctx);
      expect(p.filters.minAmount).toBeUndefined();
      expect(p.filters.maxAmount).toBeUndefined();
      expect(p.text).toContain('amount:abc');
    });
  });

  describe('entity operators', () => {
    it('resolves category name to id', () => {
      expect(parseSearchQuery('category:food', ctx).filters.categoryId).toBe('c1');
    });

    it('category is case-insensitive', () => {
      expect(parseSearchQuery('category:FOOD', ctx).filters.categoryId).toBe('c1');
    });

    it('resolves quoted wallet name', () => {
      expect(parseSearchQuery('wallet:"GTB Main"', ctx).filters.walletId).toBe('w1');
    });

    it('falls back to raw value for unknown category (RPC still handles as text)', () => {
      const p = parseSearchQuery('category:unknown', ctx);
      expect(p.filters.categoryId).toBeUndefined();
      // Keeps token as free text so the server-side ILIKE can still match.
      expect(p.text).toContain('category:unknown');
    });

    it('parses currency (uppercased)', () => {
      expect(parseSearchQuery('currency:usd', ctx).filters.currency).toBe('USD');
    });

    it('parses tag (can repeat)', () => {
      const p = parseSearchQuery('tag:work tag:refundable', ctx);
      expect(p.filters.tags).toEqual(['work', 'refundable']);
    });

    it('parses type', () => {
      expect(parseSearchQuery('type:expense', ctx).filters.type).toBe('expense');
    });

    it('ignores unknown type values', () => {
      expect(parseSearchQuery('type:weird', ctx).filters.type).toBeUndefined();
    });

    it('parses source', () => {
      expect(parseSearchQuery('source:payoneer', ctx).filters.source).toBe('payoneer');
    });
  });

  describe('date operator', () => {
    it('parses today', () => {
      const p = parseSearchQuery('date:today', ctx);
      expect(p.filters.dateRange).toBeDefined();
      const {startMs, endMs} = p.filters.dateRange!;
      const startDate = new Date(startMs);
      const endDate = new Date(endMs);
      // Normalise to YYYY-MM-DD for a timezone-independent assertion.
      expect(startDate.toISOString().slice(0, 10)).toBe('2026-04-23');
      expect(endDate.toISOString().slice(0, 10)).toBe('2026-04-23');
      expect(endMs).toBeGreaterThan(startMs);
    });

    it('parses yesterday', () => {
      const p = parseSearchQuery('date:yesterday', ctx);
      const start = new Date(p.filters.dateRange!.startMs).toISOString().slice(0, 10);
      expect(start).toBe('2026-04-22');
    });

    it('parses this-week', () => {
      const p = parseSearchQuery('date:this-week', ctx);
      expect(p.filters.dateRange).toBeDefined();
    });

    it('parses last-month', () => {
      const p = parseSearchQuery('date:last-month', ctx);
      const start = new Date(p.filters.dateRange!.startMs).toISOString().slice(0, 10);
      expect(start).toBe('2026-03-01');
    });

    it('parses YYYY-MM', () => {
      const p = parseSearchQuery('date:2024-11', ctx);
      const start = new Date(p.filters.dateRange!.startMs).toISOString().slice(0, 10);
      expect(start).toBe('2024-11-01');
      const end = new Date(p.filters.dateRange!.endMs).toISOString().slice(0, 10);
      expect(end).toBe('2024-11-30');
    });

    it('parses YYYY-MM-DD', () => {
      const p = parseSearchQuery('date:2024-11-15', ctx);
      const start = new Date(p.filters.dateRange!.startMs).toISOString().slice(0, 10);
      expect(start).toBe('2024-11-15');
    });

    it('ignores garbage date values', () => {
      const p = parseSearchQuery('date:whenever', ctx);
      expect(p.filters.dateRange).toBeUndefined();
    });
  });

  describe('removed has:/is: operators', () => {
    // The FilterSheet UI was removed and with it the has:/is: operator
    // family. They now fall through to free text so the user still gets
    // *something* if they type the old syntax out of muscle memory.
    it('treats has:receipt as free text', () => {
      const p = parseSearchQuery('has:receipt', ctx);
      expect(p.text).toContain('has:receipt');
      expect(p.filters).toEqual({});
    });

    it('treats is:recurring as free text', () => {
      const p = parseSearchQuery('is:recurring', ctx);
      expect(p.text).toContain('is:recurring');
      expect(p.filters).toEqual({});
    });
  });

  describe('combinations', () => {
    it('combines text, category, amount, and date', () => {
      const p = parseSearchQuery(
        'uber category:food amount:>10 date:this-week',
        ctx,
      );
      expect(p.text).toBe('uber');
      expect(p.filters.categoryId).toBe('c1');
      expect(p.filters.minAmount).toBe(1001);
      expect(p.filters.dateRange).toBeDefined();
    });

    it('keeps phrases, negations, and filters separate', () => {
      const p = parseSearchQuery(
        '"monthly rent" -uber category:food',
        ctx,
      );
      expect(p.phrases).toEqual(['monthly rent']);
      expect(p.negated).toEqual(['uber']);
      expect(p.filters.categoryId).toBe('c1');
      expect(p.text).toBe('');
    });
  });
});
