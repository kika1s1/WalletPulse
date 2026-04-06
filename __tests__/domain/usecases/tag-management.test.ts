import {
  collectAllTags,
  mergeUniqueSortedTagNames,
  suggestTags,
  validateTag,
  normalizeTag,
  MAX_TAG_LENGTH,
} from '@domain/usecases/tag-management';
import type {Transaction} from '@domain/entities/Transaction';

function makeTxn(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-1',
    walletId: 'w1',
    categoryId: 'cat-1',
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
    transactionDate: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('tag-management', () => {
  describe('collectAllTags', () => {
    it('extracts unique tags from transactions', () => {
      const txns = [
        makeTxn({id: 't1', tags: ['food', 'lunch']}),
        makeTxn({id: 't2', tags: ['lunch', 'team']}),
        makeTxn({id: 't3', tags: ['food', 'dinner']}),
      ];
      const result = collectAllTags(txns);
      expect(result).toEqual(
        expect.arrayContaining(['food', 'lunch', 'team', 'dinner']),
      );
      expect(result.length).toBe(4);
    });

    it('returns empty for no transactions', () => {
      expect(collectAllTags([])).toEqual([]);
    });

    it('handles transactions with no tags', () => {
      const txns = [makeTxn({tags: []}), makeTxn({tags: []})];
      expect(collectAllTags(txns)).toEqual([]);
    });

    it('sorts tags by frequency descending', () => {
      const txns = [
        makeTxn({id: 't1', tags: ['rare', 'common']}),
        makeTxn({id: 't2', tags: ['common', 'medium']}),
        makeTxn({id: 't3', tags: ['common', 'medium']}),
      ];
      const result = collectAllTags(txns);
      expect(result[0]).toBe('common');
      expect(result[1]).toBe('medium');
    });
  });

  describe('mergeUniqueSortedTagNames', () => {
    it('merges, dedupes, and sorts alphabetically', () => {
      expect(
        mergeUniqueSortedTagNames(['Zebra', 'apple'], ['apple', 'banana']),
      ).toEqual(['apple', 'banana', 'zebra']);
    });

    it('returns empty when both inputs are empty', () => {
      expect(mergeUniqueSortedTagNames([], [])).toEqual([]);
    });
  });

  describe('suggestTags', () => {
    const allTags = ['food', 'freelance', 'family', 'transport', 'team', 'travel'];

    it('filters by prefix', () => {
      expect(suggestTags('f', allTags)).toEqual(['food', 'freelance', 'family']);
    });

    it('is case-insensitive', () => {
      expect(suggestTags('F', allTags)).toEqual(['food', 'freelance', 'family']);
    });

    it('excludes already selected tags', () => {
      expect(suggestTags('f', allTags, ['food'])).toEqual(['freelance', 'family']);
    });

    it('returns empty when query is empty', () => {
      expect(suggestTags('', allTags)).toEqual([]);
    });

    it('limits to 10 results', () => {
      const many = Array.from({length: 20}, (_, i) => `tag-${i}`);
      expect(suggestTags('tag', many).length).toBeLessThanOrEqual(10);
    });
  });

  describe('validateTag', () => {
    it('accepts a valid tag', () => {
      expect(validateTag('food')).toBeNull();
    });

    it('rejects empty string', () => {
      expect(validateTag('')).toBe('Tag cannot be empty');
    });

    it('rejects whitespace-only', () => {
      expect(validateTag('   ')).toBe('Tag cannot be empty');
    });

    it('rejects tags exceeding max length', () => {
      const long = 'a'.repeat(MAX_TAG_LENGTH + 1);
      expect(validateTag(long)).toBe(`Tag must be ${MAX_TAG_LENGTH} characters or fewer`);
    });

    it('rejects tags with special characters', () => {
      expect(validateTag('food#lunch')).toBe(
        'Tag can only contain letters, numbers, hyphens, and spaces',
      );
    });
  });

  describe('normalizeTag', () => {
    it('trims and lowercases', () => {
      expect(normalizeTag('  Food  ')).toBe('food');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeTag('hello   world')).toBe('hello world');
    });
  });
});
