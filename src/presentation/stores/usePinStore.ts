import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setPin as pinServiceSetPin,
  verifyPin as pinServiceVerifyPin,
  clearPin as pinServiceClearPin,
  hasPin as pinServiceHasPin,
  changePin as pinServiceChangePin,
  type PinLength,
  type ChangePinResult,
} from '@infrastructure/security/pin-service';
import {
  enableBiometric as bioEnable,
  disableBiometric as bioDisable,
  isBiometricEnabled as bioIsEnabled,
  reEnrollBiometricIfEnabled as bioReEnrollIfEnabled,
} from '@infrastructure/security/biometric-service';
import {setScreenshotProtection} from '@infrastructure/native/SecurityBridge';

export const IMMEDIATE_LOCK_MS = 0;

export type AutoLockTimeoutOption = {
  value: number;
  label: string;
};

export const AUTO_LOCK_TIMEOUT_OPTIONS: AutoLockTimeoutOption[] = [
  {value: IMMEDIATE_LOCK_MS, label: 'Immediately'},
  {value: 60_000, label: 'After 1 minute'},
  {value: 5 * 60_000, label: 'After 5 minutes'},
  {value: 15 * 60_000, label: 'After 15 minutes'},
  {value: 30 * 60_000, label: 'After 30 minutes'},
];

export type PinMutationResult = ChangePinResult;

type PinState = {
  isHydrated: boolean;
  isPinEnabled: boolean;
  isLocked: boolean;
  biometricEnabled: boolean;
  autoLockTimeoutMs: number;
  lastActiveAt: number;
  screenshotProtectionEnabled: boolean;

  /**
   * Initial setup only. Throws if a PIN is already configured — callers
   * must route through `changePin` for rotation so the old PIN is verified
   * and biometric enrollment stays in sync.
   */
  setPin: (pin: string, length: PinLength) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;

  /**
   * Rotate an existing PIN. Requires the current PIN to be provided.
   * Re-enrolls biometric unlock with the new PIN when biometric is enabled
   * so the user doesn't silently lose biometric access.
   */
  changePin: (
    oldPin: string,
    newPin: string,
    length: PinLength,
  ) => Promise<PinMutationResult>;

  /**
   * Disable the PIN lock after verifying the current PIN. This is the only
   * way to remove the lock at runtime — there is no "Forgot PIN" bypass.
   * Recovery from a truly forgotten PIN is uninstall/reinstall + cloud restore.
   */
  removePinWithVerification: (currentPin: string) => Promise<PinMutationResult>;

  /** Internal: unconditional removal. Used by hydration / factory paths only. */
  removePin: () => Promise<void>;

  lock: () => void;
  unlock: () => void;

  setAutoLockTimeout: (ms: number) => void;
  markActive: () => void;
  shouldLock: () => boolean;

  enableBiometric: (pin: string) => Promise<void>;
  disableBiometric: () => Promise<void>;

  setScreenshotProtectionEnabled: (enabled: boolean) => void;

  hydrateFromStorage: () => Promise<void>;
};

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      isHydrated: false,
      isPinEnabled: false,
      isLocked: false,
      biometricEnabled: false,
      autoLockTimeoutMs: IMMEDIATE_LOCK_MS,
      lastActiveAt: 0,
      screenshotProtectionEnabled: false,

      setPin: async (pin, length) => {
        if (get().isPinEnabled) {
          throw new Error(
            'A PIN is already configured. Use changePin to rotate it.',
          );
        }
        await pinServiceSetPin(pin, length);
        set({isPinEnabled: true, isLocked: false});
      },

      verifyPin: async (pin) => {
        return pinServiceVerifyPin(pin);
      },

      changePin: async (oldPin, newPin, length) => {
        const result = await pinServiceChangePin(oldPin, newPin, length);
        if (!result.ok) {
          return result;
        }
        try {
          await bioReEnrollIfEnabled(newPin);
        } catch {
          /* biometric re-enroll is best-effort; fail closed by disabling it */
          await bioDisable();
          set({biometricEnabled: false});
        }
        set({isPinEnabled: true, isLocked: false});
        return {ok: true};
      },

      removePinWithVerification: async (currentPin) => {
        const ok = await pinServiceVerifyPin(currentPin);
        if (!ok) {
          return {ok: false, error: 'wrong-pin'};
        }
        await pinServiceClearPin();
        await bioDisable();
        set({
          isPinEnabled: false,
          isLocked: false,
          biometricEnabled: false,
        });
        return {ok: true};
      },

      removePin: async () => {
        await pinServiceClearPin();
        await bioDisable();
        set({
          isPinEnabled: false,
          isLocked: false,
          biometricEnabled: false,
        });
      },

      lock: () => set({isLocked: true}),
      unlock: () => set({isLocked: false, lastActiveAt: Date.now()}),

      setAutoLockTimeout: (ms) => set({autoLockTimeoutMs: ms}),

      markActive: () => set({lastActiveAt: Date.now()}),

      shouldLock: () => {
        const {isPinEnabled, autoLockTimeoutMs, lastActiveAt} = get();
        if (!isPinEnabled) {
          return false;
        }
        if (autoLockTimeoutMs <= IMMEDIATE_LOCK_MS) {
          return true;
        }
        if (lastActiveAt === 0) {
          return true;
        }
        return Date.now() - lastActiveAt >= autoLockTimeoutMs;
      },

      enableBiometric: async (pin) => {
        await bioEnable(pin);
        set({biometricEnabled: true});
      },

      disableBiometric: async () => {
        await bioDisable();
        set({biometricEnabled: false});
      },

      setScreenshotProtectionEnabled: (enabled) => {
        setScreenshotProtection(enabled);
        set({screenshotProtectionEnabled: enabled});
      },

      hydrateFromStorage: async () => {
        try {
          const [hasStoredPin, biometricOn] = await Promise.all([
            pinServiceHasPin(),
            bioIsEnabled(),
          ]);
          set({
            isPinEnabled: hasStoredPin,
            biometricEnabled: hasStoredPin && biometricOn,
            isLocked: hasStoredPin,
          });
          const {screenshotProtectionEnabled} = get();
          setScreenshotProtection(screenshotProtectionEnabled);
        } catch {
          /* hydration is best-effort */
        } finally {
          set({isHydrated: true});
        }
      },
    }),
    {
      name: 'walletpulse-pin',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        autoLockTimeoutMs: state.autoLockTimeoutMs,
        screenshotProtectionEnabled: state.screenshotProtectionEnabled,
      }),
    },
  ),
);
