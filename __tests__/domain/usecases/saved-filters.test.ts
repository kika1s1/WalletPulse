jest.mock('@data/datasources/SupabaseDataSource', () => ({
  getSupabaseDataSource: () => ({
    settings: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    },
  }),
}));

import {
  createSavedFilter,
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  addSavedFilter,
  getSavedFilters,
  removeSavedFilter,
} from '@domain/usecases/saved-filters';

describe('SavedFilter', () => {
  it('creates a saved filter with name and filter config', () => {
    const f = createSavedFilter('My Filter', {type: 'expense', currency: 'USD'});
    expect(f.name).toBe('My Filter');
    expect(f.filter.type).toBe('expense');
    expect(f.filter.currency).toBe('USD');
    expect(f.id).toBeTruthy();
    expect(f.createdAt).toBeGreaterThan(0);
  });

  it('rejects empty name', () => {
    expect(() => createSavedFilter('', {type: 'expense'})).toThrow(
      'Filter name is required',
    );
  });

  it('trims whitespace from name', () => {
    const f = createSavedFilter('  My Filter  ', {});
    expect(f.name).toBe('My Filter');
  });
});

describe('Recent searches', () => {
  beforeEach(() => {
    clearRecentSearches();
  });

  it('stores and retrieves recent searches', () => {
    addRecentSearch('coffee');
    addRecentSearch('rent');
    const recent = getRecentSearches();
    expect(recent).toEqual(['rent', 'coffee']);
  });

  it('deduplicates by moving to top', () => {
    addRecentSearch('coffee');
    addRecentSearch('rent');
    addRecentSearch('coffee');
    const recent = getRecentSearches();
    expect(recent).toEqual(['coffee', 'rent']);
  });

  it('limits to 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      addRecentSearch(`search-${i}`);
    }
    expect(getRecentSearches().length).toBe(20);
    expect(getRecentSearches()[0]).toBe('search-24');
  });

  it('trims and ignores empty queries', () => {
    addRecentSearch('');
    addRecentSearch('   ');
    expect(getRecentSearches()).toEqual([]);
  });

  it('clears all recent searches', () => {
    addRecentSearch('test');
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});

describe('Saved filter presets', () => {
  beforeEach(() => {
    for (const f of getSavedFilters()) {
      removeSavedFilter(f.id);
    }
  });

  it('adds, lists, and removes saved filter presets', () => {
    const a = addSavedFilter('Work', {type: 'expense'});
    expect(a.name).toBe('Work');
    expect(getSavedFilters().length).toBe(1);
    expect(getSavedFilters()[0].id).toBe(a.id);

    const b = addSavedFilter('Travel', {currency: 'EUR'});
    expect(getSavedFilters().length).toBe(2);
    expect(getSavedFilters()[0].name).toBe('Travel');

    removeSavedFilter(b.id);
    expect(getSavedFilters().length).toBe(1);
    expect(getSavedFilters()[0].id).toBe(a.id);
  });
});
