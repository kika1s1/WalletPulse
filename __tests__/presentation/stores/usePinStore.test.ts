import * as Keychain from 'react-native-keychain';
import {
  usePinStore,
  AUTO_LOCK_TIMEOUT_OPTIONS,
  IMMEDIATE_LOCK_MS,
} from '@presentation/stores/usePinStore';

const keychainMock = Keychain as unknown as {
  __resetStore: () => void;
  setGenericPassword: jest.Mock;
  getGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
  getSupportedBiometryType: jest.Mock;
};

jest.mock('@infrastructure/native/SecurityBridge', () => ({
  setScreenshotProtection: jest.fn(),
  isScreenshotProtectionAvailable: jest.fn(() => true),
}));

import {setScreenshotProtection} from '@infrastructure/native/SecurityBridge';

function resetStore() {
  usePinStore.setState({
    isHydrated: false,
    isPinEnabled: false,
    isLocked: false,
    biometricEnabled: false,
    autoLockTimeoutMs: IMMEDIATE_LOCK_MS,
    lastActiveAt: 0,
    screenshotProtectionEnabled: false,
  });
}

describe('usePinStore', () => {
  beforeEach(() => {
    keychainMock.__resetStore();
    keychainMock.setGenericPassword.mockClear();
    keychainMock.getGenericPassword.mockClear();
    keychainMock.resetGenericPassword.mockClear();
    keychainMock.getSupportedBiometryType.mockReset();
    keychainMock.getSupportedBiometryType.mockResolvedValue(null);
    (setScreenshotProtection as jest.Mock).mockClear();
    resetStore();
  });

  describe('pin flow', () => {
    it('starts unlocked with no pin configured', () => {
      const s = usePinStore.getState();
      expect(s.isPinEnabled).toBe(false);
      expect(s.isLocked).toBe(false);
    });

    it('setPin persists to keychain and enables lock', async () => {
      await usePinStore.getState().setPin('1234', 4);
      expect(usePinStore.getState().isPinEnabled).toBe(true);
      expect(keychainMock.setGenericPassword).toHaveBeenCalled();
    });

    it('verifyPin returns true for correct pin, false for wrong', async () => {
      await usePinStore.getState().setPin('1234', 4);
      expect(await usePinStore.getState().verifyPin('1234')).toBe(true);
      expect(await usePinStore.getState().verifyPin('9999')).toBe(false);
    });

    it('removePin clears keychain, lock state, and disables biometric', async () => {
      await usePinStore.getState().setPin('1234', 4);
      await usePinStore.getState().enableBiometric('1234');
      await usePinStore.getState().removePin();
      const s = usePinStore.getState();
      expect(s.isPinEnabled).toBe(false);
      expect(s.biometricEnabled).toBe(false);
      expect(s.isLocked).toBe(false);
    });

    it('setPin throws when a pin is already configured (must go through changePin)', async () => {
      await usePinStore.getState().setPin('1234', 4);
      await expect(
        usePinStore.getState().setPin('5678', 4),
      ).rejects.toThrow(/already/i);
    });

    it('lock and unlock toggle isLocked', () => {
      usePinStore.setState({isPinEnabled: true});
      usePinStore.getState().lock();
      expect(usePinStore.getState().isLocked).toBe(true);
      usePinStore.getState().unlock();
      expect(usePinStore.getState().isLocked).toBe(false);
    });
  });

  describe('auto-lock timeout', () => {
    it('exposes a set of timeout options including immediate', () => {
      const values = AUTO_LOCK_TIMEOUT_OPTIONS.map((o) => o.value);
      expect(values).toContain(IMMEDIATE_LOCK_MS);
      expect(values).toContain(60_000);
      expect(values).toContain(5 * 60_000);
      expect(values).toContain(15 * 60_000);
      expect(values).toContain(30 * 60_000);
    });

    it('setAutoLockTimeout updates state', () => {
      usePinStore.getState().setAutoLockTimeout(5 * 60_000);
      expect(usePinStore.getState().autoLockTimeoutMs).toBe(5 * 60_000);
    });

    it('markActive updates lastActiveAt to now', () => {
      const before = Date.now();
      usePinStore.getState().markActive();
      const {lastActiveAt} = usePinStore.getState();
      expect(lastActiveAt).toBeGreaterThanOrEqual(before);
      expect(lastActiveAt).toBeLessThanOrEqual(Date.now());
    });

    it('shouldLock returns false when pin is disabled', () => {
      usePinStore.setState({isPinEnabled: false, lastActiveAt: 0});
      expect(usePinStore.getState().shouldLock()).toBe(false);
    });

    it('shouldLock returns true when timeout is immediate and pin is enabled', () => {
      usePinStore.setState({
        isPinEnabled: true,
        autoLockTimeoutMs: IMMEDIATE_LOCK_MS,
        lastActiveAt: Date.now(),
      });
      expect(usePinStore.getState().shouldLock()).toBe(true);
    });

    it('shouldLock returns false when elapsed is below the timeout', () => {
      usePinStore.setState({
        isPinEnabled: true,
        autoLockTimeoutMs: 5 * 60_000,
        lastActiveAt: Date.now() - 60_000,
      });
      expect(usePinStore.getState().shouldLock()).toBe(false);
    });

    it('shouldLock returns true when elapsed exceeds the timeout', () => {
      usePinStore.setState({
        isPinEnabled: true,
        autoLockTimeoutMs: 60_000,
        lastActiveAt: Date.now() - 2 * 60_000,
      });
      expect(usePinStore.getState().shouldLock()).toBe(true);
    });
  });

  describe('changePin', () => {
    it('returns wrong-pin when the old PIN is incorrect and leaves state intact', async () => {
      await usePinStore.getState().setPin('1111', 4);
      const result = await usePinStore.getState().changePin('9999', '2222', 4);
      expect(result).toEqual({ok: false, error: 'wrong-pin'});
      expect(await usePinStore.getState().verifyPin('1111')).toBe(true);
      expect(await usePinStore.getState().verifyPin('2222')).toBe(false);
    });

    it('rotates the PIN when the old PIN is correct', async () => {
      await usePinStore.getState().setPin('1111', 4);
      const result = await usePinStore.getState().changePin('1111', '2222', 4);
      expect(result).toEqual({ok: true});
      expect(await usePinStore.getState().verifyPin('2222')).toBe(true);
      expect(await usePinStore.getState().verifyPin('1111')).toBe(false);
    });

    it('re-enrolls biometric with the new PIN when biometric was enabled', async () => {
      await usePinStore.getState().setPin('1111', 4);
      await usePinStore.getState().enableBiometric('1111');

      const result = await usePinStore.getState().changePin('1111', '2222', 4);
      expect(result).toEqual({ok: true});
      expect(usePinStore.getState().biometricEnabled).toBe(true);

      // The biometric slot should now hold the new PIN.
      const {unlockWithBiometric} = require('@infrastructure/security/biometric-service');
      expect(await unlockWithBiometric()).toBe('2222');
    });

    it('does not enable biometric when it was previously off', async () => {
      await usePinStore.getState().setPin('1111', 4);
      await usePinStore.getState().changePin('1111', '2222', 4);
      expect(usePinStore.getState().biometricEnabled).toBe(false);
    });
  });

  describe('removePinWithVerification', () => {
    it('returns wrong-pin without mutating state when PIN is incorrect', async () => {
      await usePinStore.getState().setPin('1111', 4);
      const result = await usePinStore
        .getState()
        .removePinWithVerification('9999');
      expect(result).toEqual({ok: false, error: 'wrong-pin'});
      expect(usePinStore.getState().isPinEnabled).toBe(true);
      expect(await usePinStore.getState().verifyPin('1111')).toBe(true);
    });

    it('clears the PIN and disables biometric when correct PIN is provided', async () => {
      await usePinStore.getState().setPin('1111', 4);
      await usePinStore.getState().enableBiometric('1111');

      const result = await usePinStore
        .getState()
        .removePinWithVerification('1111');

      expect(result).toEqual({ok: true});
      const s = usePinStore.getState();
      expect(s.isPinEnabled).toBe(false);
      expect(s.biometricEnabled).toBe(false);
      expect(s.isLocked).toBe(false);
    });
  });

  describe('biometric', () => {
    it('starts with biometric disabled', () => {
      expect(usePinStore.getState().biometricEnabled).toBe(false);
    });

    it('enableBiometric stores pin and flips flag', async () => {
      await usePinStore.getState().setPin('1234', 4);
      await usePinStore.getState().enableBiometric('1234');
      expect(usePinStore.getState().biometricEnabled).toBe(true);
    });

    it('disableBiometric flips flag back', async () => {
      await usePinStore.getState().setPin('1234', 4);
      await usePinStore.getState().enableBiometric('1234');
      await usePinStore.getState().disableBiometric();
      expect(usePinStore.getState().biometricEnabled).toBe(false);
    });
  });

  describe('screenshot protection', () => {
    it('starts disabled', () => {
      expect(usePinStore.getState().screenshotProtectionEnabled).toBe(false);
    });

    it('setScreenshotProtectionEnabled updates state and calls native bridge', () => {
      usePinStore.getState().setScreenshotProtectionEnabled(true);
      expect(usePinStore.getState().screenshotProtectionEnabled).toBe(true);
      expect(setScreenshotProtection).toHaveBeenCalledWith(true);

      usePinStore.getState().setScreenshotProtectionEnabled(false);
      expect(usePinStore.getState().screenshotProtectionEnabled).toBe(false);
      expect(setScreenshotProtection).toHaveBeenLastCalledWith(false);
    });
  });
});
