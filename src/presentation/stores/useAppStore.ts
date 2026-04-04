import {create} from 'zustand';

type AppState = {
  isInitialized: boolean;
  isLoading: boolean;
  baseCurrency: string;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setBaseCurrency: (currency: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isInitialized: false,
  isLoading: false,
  baseCurrency: 'USD',
  setInitialized: (value) => set({isInitialized: value}),
  setLoading: (value) => set({isLoading: value}),
  setBaseCurrency: (currency) => set({baseCurrency: currency}),
}));
