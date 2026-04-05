import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppState = {
  isInitialized: boolean;
  isLoading: boolean;
  baseCurrency: string;
  setInitialized: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setBaseCurrency: (currency: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isInitialized: false,
      isLoading: false,
      baseCurrency: 'USD',
      setInitialized: (value) => set({isInitialized: value}),
      setLoading: (value) => set({isLoading: value}),
      setBaseCurrency: (currency) => set({baseCurrency: currency}),
    }),
    {
      name: 'walletpulse-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({baseCurrency: state.baseCurrency}),
    },
  ),
);
