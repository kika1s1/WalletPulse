import * as Keychain from 'react-native-keychain';
import {sha256} from 'js-sha256';
import {
  setPin,
  verifyPin,
  clearPin,
  hasPin,
  changePin,
  PIN_KEYCHAIN_SERVICE,
  PIN_HASH_VERSION,
  PIN_PBKDF2_ITERATIONS,
} from '@infrastructure/security/pin-service';

const keychainMock = Keychain as unknown as {
  __resetStore: () => void;
  setGenericPassword: jest.Mock;
  getGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
};

async function seedLegacyV1Record(pin: string, length: 4 | 6): Promise<void> {
  const salt = 'legacy-salt-0123456789abcdef0123456789abcdef';
  const hash = sha256(`${salt}:${pin}`);
  const record = {salt, hash, length};
  await Keychain.setGenericPassword('pin', JSON.stringify(record), {
    service: PIN_KEYCHAIN_SERVICE,
  });
}

describe('pin-service', () => {
  beforeEach(() => {
    keychainMock.__resetStore();
    keychainMock.setGenericPassword.mockClear();
    keychainMock.getGenericPassword.mockClear();
    keychainMock.resetGenericPassword.mockClear();
  });

  describe('setPin (v2 PBKDF2)', () => {
    it('stores a versioned PBKDF2 record (not the raw pin)', async () => {
      await setPin('1234', 4);

      expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
      const [, passwordJson, options] = keychainMock.setGenericPassword.mock.calls[0];
      const parsed = JSON.parse(passwordJson);

      expect(parsed.v).toBe(PIN_HASH_VERSION);
      expect(parsed.iterations).toBe(PIN_PBKDF2_ITERATIONS);
      expect(parsed.salt).toMatch(/^[0-9a-f]+$/i);
      expect(parsed.salt.length).toBeGreaterThanOrEqual(32);
      expect(parsed.hash).toMatch(/^[0-9a-f]+$/);
      expect(parsed.hash.length).toBeGreaterThanOrEqual(64);
      expect(parsed.length).toBe(4);
      expect(passwordJson.includes('1234')).toBe(false);
      expect(options?.service).toBe(PIN_KEYCHAIN_SERVICE);
    });

    it('produces different hashes for the same pin on each set (unique salt)', async () => {
      await setPin('1234', 4);
      const firstJson = keychainMock.setGenericPassword.mock.calls[0][1] as string;
      keychainMock.__resetStore();
      keychainMock.setGenericPassword.mockClear();

      await setPin('1234', 4);
      const secondJson = keychainMock.setGenericPassword.mock.calls[0][1] as string;

      const first = JSON.parse(firstJson);
      const second = JSON.parse(secondJson);
      expect(first.salt).not.toBe(second.salt);
      expect(first.hash).not.toBe(second.hash);
    });

    it('supports 6-digit pin length', async () => {
      await setPin('123456', 6);
      const parsed = JSON.parse(
        keychainMock.setGenericPassword.mock.calls[0][1] as string,
      );
      expect(parsed.length).toBe(6);
    });

    it('rejects pins that do not match the declared length', async () => {
      await expect(setPin('123', 4)).rejects.toThrow(/length/i);
      await expect(setPin('12345', 6)).rejects.toThrow(/length/i);
    });

    it('rejects non-digit pins', async () => {
      await expect(setPin('12ab', 4)).rejects.toThrow(/digit/i);
    });
  });

  describe('verifyPin', () => {
    it('returns true for the correct pin (v2)', async () => {
      await setPin('4321', 4);
      expect(await verifyPin('4321')).toBe(true);
    });

    it('returns false for the wrong pin', async () => {
      await setPin('4321', 4);
      expect(await verifyPin('1234')).toBe(false);
    });

    it('returns false when no pin is set', async () => {
      expect(await verifyPin('0000')).toBe(false);
    });

    it('returns false for a pin of different length than stored', async () => {
      await setPin('4321', 4);
      expect(await verifyPin('432100')).toBe(false);
    });
  });

  describe('v1 → v2 migration on successful verify', () => {
    it('verifies a legacy v1 SHA-256 record as the correct pin', async () => {
      await seedLegacyV1Record('4321', 4);
      expect(await verifyPin('4321')).toBe(true);
    });

    it('rejects a wrong pin against a v1 record and does NOT migrate', async () => {
      await seedLegacyV1Record('4321', 4);
      keychainMock.setGenericPassword.mockClear();

      expect(await verifyPin('9999')).toBe(false);
      expect(keychainMock.setGenericPassword).not.toHaveBeenCalled();
    });

    it('upgrades a v1 record to v2 on successful verify', async () => {
      await seedLegacyV1Record('4321', 4);
      keychainMock.setGenericPassword.mockClear();

      const ok = await verifyPin('4321');
      expect(ok).toBe(true);

      expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
      const rewritten = JSON.parse(
        keychainMock.setGenericPassword.mock.calls[0][1] as string,
      );
      expect(rewritten.v).toBe(PIN_HASH_VERSION);
      expect(rewritten.iterations).toBe(PIN_PBKDF2_ITERATIONS);
      expect(rewritten.length).toBe(4);
      // After migration a subsequent verify must still succeed.
      expect(await verifyPin('4321')).toBe(true);
    });
  });

  describe('hasPin', () => {
    it('returns false initially', async () => {
      expect(await hasPin()).toBe(false);
    });

    it('returns true after setPin', async () => {
      await setPin('4321', 4);
      expect(await hasPin()).toBe(true);
    });

    it('returns true for a legacy v1 record', async () => {
      await seedLegacyV1Record('4321', 4);
      expect(await hasPin()).toBe(true);
    });
  });

  describe('clearPin', () => {
    it('removes the stored pin', async () => {
      await setPin('4321', 4);
      await clearPin();
      expect(await hasPin()).toBe(false);
      expect(await verifyPin('4321')).toBe(false);
      expect(keychainMock.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({service: PIN_KEYCHAIN_SERVICE}),
      );
    });
  });

  describe('changePin', () => {
    it('rejects with wrong-pin when old pin is incorrect and leaves record untouched', async () => {
      await setPin('1111', 4);
      const originalJson = keychainMock.setGenericPassword.mock.calls[0][1];
      keychainMock.setGenericPassword.mockClear();

      const result = await changePin('9999', '2222', 4);
      expect(result).toEqual({ok: false, error: 'wrong-pin'});
      expect(keychainMock.setGenericPassword).not.toHaveBeenCalled();

      // old pin still verifies
      expect(await verifyPin('1111')).toBe(true);
      // stored record unchanged
      const parsed = JSON.parse(originalJson as string);
      expect(parsed.hash).toBeDefined();
    });

    it('writes a new record when old pin is correct', async () => {
      await setPin('1111', 4);
      keychainMock.setGenericPassword.mockClear();

      const result = await changePin('1111', '2222', 4);
      expect(result).toEqual({ok: true});

      expect(keychainMock.setGenericPassword).toHaveBeenCalledTimes(1);
      expect(await verifyPin('2222')).toBe(true);
      expect(await verifyPin('1111')).toBe(false);
    });

    it('supports changing pin length (4 → 6)', async () => {
      await setPin('1111', 4);
      const result = await changePin('1111', '222222', 6);
      expect(result).toEqual({ok: true});
      expect(await verifyPin('222222')).toBe(true);

      const lastCall = keychainMock.setGenericPassword.mock.calls.slice(-1)[0];
      const parsed = JSON.parse(lastCall[1] as string);
      expect(parsed.length).toBe(6);
    });

    it('rejects with wrong-pin when no pin is configured yet', async () => {
      const result = await changePin('1111', '2222', 4);
      expect(result).toEqual({ok: false, error: 'wrong-pin'});
    });

    it('validates the new pin format', async () => {
      await setPin('1111', 4);
      await expect(changePin('1111', '22', 4)).rejects.toThrow(/length/i);
      await expect(changePin('1111', '22ab', 4)).rejects.toThrow(/digit/i);
    });

    it('migrates a v1 record and rotates to a new PIN atomically', async () => {
      await seedLegacyV1Record('1111', 4);

      const result = await changePin('1111', '2222', 4);
      expect(result).toEqual({ok: true});

      const lastCall = keychainMock.setGenericPassword.mock.calls.slice(-1)[0];
      const parsed = JSON.parse(lastCall[1] as string);
      expect(parsed.v).toBe(PIN_HASH_VERSION);
      expect(await verifyPin('2222')).toBe(true);
      expect(await verifyPin('1111')).toBe(false);
    });
  });
});
