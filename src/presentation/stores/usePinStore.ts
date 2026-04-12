import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function hashPin(pin: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

type PinState = {
  pinHash: string | null;
  isPinEnabled: boolean;
  isLocked: boolean;

  setPin: (pin: string) => void;
  removePin: () => void;
  verifyPin: (pin: string) => boolean;
  lock: () => void;
  unlock: () => void;
};

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      isPinEnabled: false,
      isLocked: false,

      setPin: (pin: string) => {
        const hashed = hashPin(pin);
        set({pinHash: hashed, isPinEnabled: true, isLocked: false});
      },

      removePin: () => {
        set({pinHash: null, isPinEnabled: false, isLocked: false});
      },

      verifyPin: (pin: string) => {
        const {pinHash} = get();
        if (!pinHash) {return false;}
        return hashPin(pin) === pinHash;
      },

      lock: () => set({isLocked: true}),
      unlock: () => set({isLocked: false}),
    }),
    {
      name: 'walletpulse-pin',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pinHash: state.pinHash,
        isPinEnabled: state.isPinEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isPinEnabled) {
          state.isLocked = true;
        }
      },
    },
  ),
);
