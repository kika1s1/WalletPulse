import * as Keychain from 'react-native-keychain';
import {
  isBiometricAvailable,
  enableBiometric,
  disableBiometric,
  isBiometricEnabled,
  unlockWithBiometric,
  reEnrollBiometricIfEnabled,
  BIOMETRIC_KEYCHAIN_SERVICE,
} from '@infrastructure/security/biometric-service';

const keychainMock = Keychain as unknown as {
  __resetStore: () => void;
  setGenericPassword: jest.Mock;
  getGenericPassword: jest.Mock;
  hasGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
  getSupportedBiometryType: jest.Mock;
};

describe('biometric-service', () => {
  beforeEach(() => {
    keychainMock.__resetStore();
    keychainMock.setGenericPassword.mockClear();
    keychainMock.getGenericPassword.mockClear();
    keychainMock.hasGenericPassword.mockClear();
    keychainMock.resetGenericPassword.mockClear();
    keychainMock.getSupportedBiometryType.mockReset();
    keychainMock.getSupportedBiometryType.mockResolvedValue(null);
  });

  describe('isBiometricAvailable', () => {
    it('returns false when device has no biometry hardware', async () => {
      keychainMock.getSupportedBiometryType.mockResolvedValueOnce(null);
      expect(await isBiometricAvailable()).toBe(false);
    });

    it('returns true when device reports fingerprint hardware', async () => {
      keychainMock.getSupportedBiometryType.mockResolvedValueOnce('Fingerprint');
      expect(await isBiometricAvailable()).toBe(true);
    });

    it('returns true when device reports face hardware', async () => {
      keychainMock.getSupportedBiometryType.mockResolvedValueOnce('Face');
      expect(await isBiometricAvailable()).toBe(true);
    });

    it('returns false if keychain query throws', async () => {
      keychainMock.getSupportedBiometryType.mockRejectedValueOnce(new Error('no biometry'));
      expect(await isBiometricAvailable()).toBe(false);
    });
  });

  describe('enableBiometric', () => {
    it('stores the pin in the biometric-protected keychain slot', async () => {
      await enableBiometric('1234');
      expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
      const [, password, options] = keychainMock.setGenericPassword.mock.calls[0];
      expect(password).toBe('1234');
      expect(options?.service).toBe(BIOMETRIC_KEYCHAIN_SERVICE);
      expect(options?.accessControl).toBe(Keychain.ACCESS_CONTROL.BIOMETRY_ANY);
    });

    it('throws when an empty pin is passed', async () => {
      await expect(enableBiometric('')).rejects.toThrow(/pin/i);
      expect(keychainMock.setGenericPassword).not.toHaveBeenCalled();
    });
  });

  describe('isBiometricEnabled', () => {
    it('returns false initially', async () => {
      expect(await isBiometricEnabled()).toBe(false);
    });

    it('returns true once enabled', async () => {
      await enableBiometric('1234');
      expect(await isBiometricEnabled()).toBe(true);
    });

    it('returns false after disabling', async () => {
      await enableBiometric('1234');
      await disableBiometric();
      expect(await isBiometricEnabled()).toBe(false);
    });

    // Regression: the old implementation called getGenericPassword which
    // triggers decryption of the biometric-protected entry and therefore
    // requires the user to authenticate before we even know if biometric
    // was enrolled. On Android that manifests as a UserNotAuthenticated-
    // Exception which the catch swallowed — making the PIN screen think
    // biometric was disabled and hiding the unlock button. Enforce that
    // enrollment-check never decrypts the keychain entry.
    it('must not call getGenericPassword when checking enrollment', async () => {
      await enableBiometric('1234');
      keychainMock.getGenericPassword.mockClear();
      await isBiometricEnabled();
      expect(keychainMock.getGenericPassword).not.toHaveBeenCalled();
    });

    it('uses the existence-check keychain API (hasGenericPassword)', async () => {
      await enableBiometric('1234');
      keychainMock.hasGenericPassword.mockClear();
      await isBiometricEnabled();
      expect(keychainMock.hasGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({service: BIOMETRIC_KEYCHAIN_SERVICE}),
      );
    });

    it('returns false (not throws) when the existence check rejects', async () => {
      keychainMock.hasGenericPassword.mockRejectedValueOnce(
        new Error('keystore unavailable'),
      );
      expect(await isBiometricEnabled()).toBe(false);
    });
  });

  describe('unlockWithBiometric', () => {
    it('returns the stored pin when biometric auth succeeds', async () => {
      await enableBiometric('4321');
      const pin = await unlockWithBiometric();
      expect(pin).toBe('4321');
    });

    it('returns null when no biometric is enabled', async () => {
      expect(await unlockWithBiometric()).toBeNull();
    });

    it('returns null when the user cancels biometric prompt (rejection)', async () => {
      await enableBiometric('4321');
      keychainMock.getGenericPassword.mockRejectedValueOnce(new Error('user canceled'));
      expect(await unlockWithBiometric()).toBeNull();
    });

    it('passes an authentication prompt to keychain', async () => {
      await enableBiometric('4321');
      keychainMock.getGenericPassword.mockClear();
      await unlockWithBiometric();
      const options = keychainMock.getGenericPassword.mock.calls[0][0];
      expect(options?.service).toBe(BIOMETRIC_KEYCHAIN_SERVICE);
      expect(options?.authenticationPrompt).toEqual(
        expect.objectContaining({title: expect.any(String)}),
      );
    });
  });

  describe('disableBiometric', () => {
    it('removes the stored pin', async () => {
      await enableBiometric('1234');
      await disableBiometric();
      expect(keychainMock.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({service: BIOMETRIC_KEYCHAIN_SERVICE}),
      );
    });
  });

  describe('reEnrollBiometricIfEnabled', () => {
    it('is a no-op when biometric is not enabled', async () => {
      keychainMock.setGenericPassword.mockClear();
      await reEnrollBiometricIfEnabled('9999');
      expect(keychainMock.setGenericPassword).not.toHaveBeenCalled();
    });

    it('rewrites the stored pin with the new value when biometric is enabled', async () => {
      await enableBiometric('1234');
      keychainMock.setGenericPassword.mockClear();

      await reEnrollBiometricIfEnabled('5678');

      expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
      const [, password, options] = keychainMock.setGenericPassword.mock.calls[0];
      expect(password).toBe('5678');
      expect(options?.service).toBe(BIOMETRIC_KEYCHAIN_SERVICE);

      expect(await unlockWithBiometric()).toBe('5678');
    });

    it('throws when called with an empty pin while enabled', async () => {
      await enableBiometric('1234');
      await expect(reEnrollBiometricIfEnabled('')).rejects.toThrow(/pin/i);
    });
  });
});
