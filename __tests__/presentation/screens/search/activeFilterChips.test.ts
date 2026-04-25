import {buildActiveFilterChips} from '@presentation/screens/search/activeFilterChips';

const lookup = {
  categories: [{id: 'cat-1', name: 'Groceries'}],
  wallets: [{id: 'w-1', name: 'Main USD'}],
};

describe('buildActiveFilterChips', () => {
  it('returns no chips when no filters are active', () => {
    expect(buildActiveFilterChips({}, lookup)).toEqual([]);
  });

  it('includes a Source chip when source is set (regression)', () => {
    const chips = buildActiveFilterChips({source: 'payoneer'}, lookup);
    expect(chips).toEqual([{key: 'source', label: 'Payoneer'}]);
  });

  it('shows category and wallet names from the lookup', () => {
    const chips = buildActiveFilterChips(
      {categoryId: 'cat-1', walletId: 'w-1'},
      lookup,
    );
    expect(chips).toEqual([
      {key: 'category', label: 'Groceries'},
      {key: 'wallet', label: 'Main USD'},
    ]);
  });

  it('falls back gracefully when ids are unknown', () => {
    const chips = buildActiveFilterChips(
      {categoryId: 'missing', walletId: 'missing'},
      lookup,
    );
    expect(chips).toEqual([
      {key: 'category', label: 'Category'},
      {key: 'wallet', label: 'Wallet'},
    ]);
  });

  it('emits chips for every supported boolean filter', () => {
    const chips = buildActiveFilterChips(
      {
        hasReceipt: true,
        hasNotes: true,
        hasLocation: true,
        hasTags: true,
        isRecurring: true,
        isTemplate: true,
        isUncategorized: true,
      },
      lookup,
    );
    expect(chips.map((c) => c.key)).toEqual([
      'hasReceipt',
      'hasNotes',
      'hasLocation',
      'hasTags',
      'isRecurring',
      'isTemplate',
      'isUncategorized',
    ]);
  });

  it('combines amount range into a single chip', () => {
    const chips = buildActiveFilterChips(
      {minAmount: 1000, maxAmount: 5000},
      lookup,
    );
    expect(chips).toEqual([{key: 'amount', label: '>=10 <=50'}]);
  });

  it('renders type and date range chips', () => {
    const chips = buildActiveFilterChips(
      {
        type: 'expense',
        dateRange: {startMs: 1, endMs: 2},
      },
      lookup,
    );
    expect(chips).toEqual([
      {key: 'type', label: 'Expense'},
      {key: 'date', label: 'Date range'},
    ]);
  });

  it('renders a tag chip with hash prefix per tag', () => {
    const chips = buildActiveFilterChips({tags: ['work', 'travel']}, lookup);
    expect(chips).toEqual([{key: 'tags', label: '#work #travel'}]);
  });
});
