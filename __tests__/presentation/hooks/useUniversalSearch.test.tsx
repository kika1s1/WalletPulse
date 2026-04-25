import {act, renderHook, waitFor} from '@testing-library/react-native';

// Must be mocked before importing the hook. Variables referenced in
// jest.mock factories must be prefixed with `mock`.
const mockSearch = jest.fn();

jest.mock('@data/datasources/SupabaseDataSource', () => ({
  getSupabaseDataSource: () => ({
    search: {search: mockSearch},
    transactions: {findAll: jest.fn().mockResolvedValue([])},
  }),
  isDataSourceReady: () => true,
}));

import {useUniversalSearch} from '@presentation/hooks/useUniversalSearch';
import type {GroupedSearchResults} from '@data/repositories/UniversalSearchRepository';
import type {Transaction} from '@domain/entities/Transaction';
import {resetLocalSearchIndexForTests, getLocalSearchIndex} from '@infrastructure/search/LocalSearchIndex';

const emptyResults: GroupedSearchResults = {
  transactions: [], wallets: [], categories: [], budgets: [],
};

function tx(id: string, merchant: string, date = 1_700_000_000_000): Transaction {
  return {
    id, walletId: 'w', categoryId: 'c', amount: 1000, currency: 'USD',
    type: 'expense', description: '', merchant, source: 'manual',
    sourceHash: '', tags: [], receiptUri: '', isRecurring: false,
    recurrenceRule: '', confidence: 1, notes: '', isTemplate: false,
    templateName: '', transactionDate: date, createdAt: 0, updatedAt: 0,
  };
}

const ctx = {wallets: [], categories: []};

beforeEach(() => {
  mockSearch.mockReset();
  resetLocalSearchIndexForTests();
});

describe('useUniversalSearch', () => {
  it('is idle by default and issues no request', () => {
    const {result} = renderHook(() => useUniversalSearch({ctx}));
    expect(result.current.status).toBe('idle');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('debounces fast typing and only issues one request', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const {result} = renderHook(() => useUniversalSearch({ctx}));

    act(() => { result.current.setRaw('u'); });
    act(() => { result.current.setRaw('ub'); });
    act(() => { result.current.setRaw('ubr'); });
    // Flush debounce window (250ms) in one go.
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledTimes(1);
    });
    expect(mockSearch.mock.calls[0][0].query).toBe('ubr');
    jest.useRealTimers();
  });

  it('reports empty when RPC returns nothing', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const {result} = renderHook(() => useUniversalSearch({ctx}));
    act(() => { result.current.setRaw('zzz'); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.status).toBe('empty'));
    jest.useRealTimers();
  });

  it('falls back to the local index on network errors', async () => {
    jest.useFakeTimers();
    mockSearch.mockRejectedValue(new Error('Network request failed'));
    const idx = getLocalSearchIndex();
    await idx.rebuild([tx('t-1', 'Uber Eats')], [], [], []);

    const {result} = renderHook(() => useUniversalSearch({ctx}));
    act(() => { result.current.setRaw('uber'); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(result.current.usingOfflineIndex).toBe(true);
      expect(result.current.results.transactions).toHaveLength(1);
    });
    jest.useRealTimers();
  });

  it('reports error for non-network failures', async () => {
    jest.useFakeTimers();
    mockSearch.mockRejectedValue(new Error('internal server error'));
    const {result} = renderHook(() => useUniversalSearch({ctx}));
    act(() => { result.current.setRaw('foo'); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    jest.useRealTimers();
  });

  it('clearAll resets to idle', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const {result} = renderHook(() => useUniversalSearch({ctx}));
    act(() => { result.current.setRaw('foo'); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.status).not.toBe('idle'));
    act(() => { result.current.clearAll(); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    jest.useRealTimers();
  });

  it('passes operator-derived filters through to the RPC', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const ctxWithCategory = {
      wallets: [],
      categories: [{id: 'cat-1', name: 'Food', type: 'expense' as const}],
    };
    const {result} = renderHook(() => useUniversalSearch({ctx: ctxWithCategory}));
    act(() => { result.current.setRaw('category:food'); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
    const args = mockSearch.mock.calls[0][0];
    expect(args.filters.categoryId).toBe('cat-1');
    jest.useRealTimers();
  });

  it('clears stale results when the text query becomes too short', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValueOnce({
      ...emptyResults,
      wallets: [{entity: 'wallet', id: 'wallet-1', rank: 1, wallet: {
        id: 'wallet-1',
        currency: 'USD',
        name: 'Main Wallet',
        balance: 0,
        isActive: true,
        icon: '',
        color: '',
        sortOrder: 0,
        createdAt: 0,
        updatedAt: 0,
      }}],
    });
    const {result} = renderHook(() => useUniversalSearch({ctx}));

    act(() => { result.current.setRaw('main'); });
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.results.wallets).toHaveLength(1));

    act(() => { result.current.setRaw(''); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
      expect(result.current.results.wallets).toHaveLength(0);
    });
    jest.useRealTimers();
  });

  it('runs a search even for single-character queries (wallet name lookup)', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const {result} = renderHook(() => useUniversalSearch({ctx}));
    act(() => { result.current.setRaw('m'); });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
    expect(mockSearch.mock.calls[0][0].query).toBe('m');
    jest.useRealTimers();
  });

  it('does not send the removed has:/is: filter flags', async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue(emptyResults);
    const {result} = renderHook(() => useUniversalSearch({ctx}));

    act(() => {
      result.current.setRaw('has:receipt is:recurring');
    });
    act(() => { jest.advanceTimersByTime(300); });

    await waitFor(() => expect(mockSearch).toHaveBeenCalled());
    const args = mockSearch.mock.calls[0][0];
    expect(args.filters).not.toHaveProperty('hasReceipt');
    expect(args.filters).not.toHaveProperty('isRecurring');
    expect(args.filters).not.toHaveProperty('isUncategorized');
    jest.useRealTimers();
  });
});
