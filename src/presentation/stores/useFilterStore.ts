import {create} from 'zustand';

export type TransactionTypeFilter = 'all' | 'expense' | 'income' | 'transfer';

type FilterState = {
  typeFilter: TransactionTypeFilter;
  searchQuery: string;
  selectedWalletId: string | null;
  selectedCategoryId: string | null;
  dateRange: {startMs: number; endMs: number} | null;
  setTypeFilter: (filter: TransactionTypeFilter) => void;
  setSearchQuery: (query: string) => void;
  setSelectedWalletId: (id: string | null) => void;
  setSelectedCategoryId: (id: string | null) => void;
  setDateRange: (range: {startMs: number; endMs: number} | null) => void;
  resetFilters: () => void;
};

const initialState = {
  typeFilter: 'all' as TransactionTypeFilter,
  searchQuery: '',
  selectedWalletId: null as string | null,
  selectedCategoryId: null as string | null,
  dateRange: null as {startMs: number; endMs: number} | null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  setTypeFilter: (filter) => set({typeFilter: filter}),
  setSearchQuery: (query) => set({searchQuery: query}),
  setSelectedWalletId: (id) => set({selectedWalletId: id}),
  setSelectedCategoryId: (id) => set({selectedCategoryId: id}),
  setDateRange: (range) => set({dateRange: range}),
  resetFilters: () => set({...initialState}),
}));
