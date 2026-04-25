import {renderHook, waitFor} from '@testing-library/react-native';

const mockFindAll = jest.fn();

jest.mock('@data/datasources/SupabaseDataSource', () => ({
  getSupabaseDataSource: () => ({
    transactions: {findAll: mockFindAll},
  }),
  isDataSourceReady: () => true,
}));

import {useSearchSuggestions} from '@presentation/hooks/useSearchSuggestions';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category} from '@domain/entities/Category';

function wallet(id: string, name: string, currency = 'USD'): Wallet {
  return {
    id,
    name,
    currency,
    type: 'cash',
    balance: 0,
    icon: '',
    color: '#000',
    createdAt: 0,
    updatedAt: 0,
    isActive: true,
    sourceTag: '',
    notes: '',
  } as unknown as Wallet;
}

function category(id: string, name: string, type: 'expense' | 'income' = 'expense'): Category {
  return {
    id,
    name,
    type,
    icon: '#',
    color: '#000',
    createdAt: 0,
    updatedAt: 0,
    isActive: true,
    parentId: null,
  } as unknown as Category;
}

beforeEach(() => {
  mockFindAll.mockReset();
  mockFindAll.mockResolvedValue([]);
});

describe('useSearchSuggestions', () => {
  it('returns nothing for an empty query', async () => {
    const {result} = renderHook(() =>
      useSearchSuggestions('', {wallets: [], categories: []}),
    );
    expect(result.current).toEqual([]);
  });

  it('suggests wallets whose name matches the user query, with entityId for navigation', async () => {
    const wallets = [
      wallet('w-pay', 'Payoneer'),
      wallet('w-grey', 'Grey'),
      wallet('w-duka', 'Dukascopy'),
    ];
    const {result} = renderHook(() =>
      useSearchSuggestions('Pay', {wallets, categories: []}),
    );

    const walletSuggestions = result.current.filter((s) => s.kind === 'wallet');
    expect(walletSuggestions.length).toBeGreaterThan(0);
    const payoneer = walletSuggestions.find((s) => s.label === 'Payoneer');
    expect(payoneer).toBeDefined();
    expect(payoneer?.entityId).toBe('w-pay');
  });

  it('suggests categories whose name matches the user query, with entityId for navigation', async () => {
    const categories = [
      category('c-food', 'Food'),
      category('c-fuel', 'Fuel'),
      category('c-rent', 'Rent'),
    ];
    const {result} = renderHook(() =>
      useSearchSuggestions('foo', {wallets: [], categories}),
    );

    const food = result.current.find((s) => s.kind === 'category' && s.label === 'Food');
    expect(food).toBeDefined();
    expect(food?.entityId).toBe('c-food');
  });

  it('still proposes operator hints when the user types an operator prefix', async () => {
    const {result} = renderHook(() =>
      useSearchSuggestions('cat', {wallets: [], categories: []}),
    );
    expect(result.current.some((s) => s.kind === 'operator' && s.token === 'category:')).toBe(true);
  });

  it('keeps working when no entity arrays are provided (back-compat)', async () => {
    const {result} = renderHook(() => useSearchSuggestions('cat'));
    expect(result.current.some((s) => s.kind === 'operator' && s.token === 'category:')).toBe(true);
  });

  it('pulls merchants and tags from recent transactions on mount', async () => {
    mockFindAll.mockResolvedValueOnce([
      {merchant: 'Uber', tags: ['transport']},
      {merchant: 'Uber Eats', tags: []},
      {merchant: 'Spotify', tags: []},
    ]);

    const {result, rerender} = renderHook(
      ({q}: {q: string}) => useSearchSuggestions(q, {wallets: [], categories: []}),
      {initialProps: {q: ''}},
    );

    await waitFor(() => expect(mockFindAll).toHaveBeenCalled());
    rerender({q: 'ub'});

    await waitFor(() => {
      expect(result.current.some((s) => s.kind === 'merchant' && s.label === 'Uber')).toBe(true);
    });
  });
});
