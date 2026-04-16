import * as Keychain from 'react-native-keychain';
import QuickCrypto from 'react-native-quick-crypto';
import {sha256} from 'js-sha256';
import {generateSalt} from '@shared/utils/crypto';

export const PIN_KEYCHAIN_SERVICE = 'walletpulse-pin';

/**
 * Hash algorithm version for the stored PIN record.
 *
 *   v1 (legacy) — plain SHA-256 over `${salt}:${pin}`. Fast to brute force
 *                 (10k possibilities for a 4-digit PIN). Read-only; any
 *                 successful verify triggers an in-place migration to v2.
 *   v2           — PBKDF2-HMAC-SHA256 with `PIN_PBKDF2_ITERATIONS` iterations
 *                  and a 32-byte derived key. Backed by react-native-quick-crypto
 *                  (native / OpenSSL) so verify latency stays in single-digit ms.
 */
export const PIN_HASH_VERSION = 2 as const;

/**
 * OWASP 2023 floor for PBKDF2-SHA256. Upgrade path: increase this value and,
 * on successful verify, re-hash at the new cost — same pattern used for the
 * v1 → v2 migration.
 */
export const PIN_PBKDF2_ITERATIONS = 100_000;

const PBKDF2_KEY_LEN = 32;
const PBKDF2_DIGEST = 'sha256';

export type PinLength = 4 | 6;

type StoredPinRecordV1 = {
  salt: string;
  hash: string;
  length: PinLength;
};

type StoredPinRecordV2 = {
  v: 2;
  salt: string;
  hash: string;
  length: PinLength;
  iterations: number;
};

type StoredPinRecord = StoredPinRecordV1 | StoredPinRecordV2;

export type ChangePinResult =
  | {ok: true}
  | {ok: false; error: 'wrong-pin'};

function isV2(record: StoredPinRecord): record is StoredPinRecordV2 {
  return (record as StoredPinRecordV2).v === 2;
}

function legacyHashV1(salt: string, pin: string): string {
  return sha256(`${salt}:${pin}`);
}

function pbkdf2Hex(
  pin: string,
  salt: string,
  iterations: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // `Buffer` is declared as the callback type by react-native-quick-crypto
    // but we don't want to pull in Node's type definitions just for this one
    // call. At runtime the value is always a Uint8Array-compatible view.
    const cb = (
      err: Error | null,
      derived?: Uint8Array | null,
    ): void => {
      if (err) {
        reject(err);
        return;
      }
      if (!derived) {
        reject(new Error('PBKDF2 returned no key material'));
        return;
      }
      const bytes =
        derived instanceof Uint8Array
          ? derived
          : new Uint8Array(
              (derived as ArrayBufferView).buffer,
              (derived as ArrayBufferView).byteOffset,
              (derived as ArrayBufferView).byteLength,
            );
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      resolve(hex);
    };
    QuickCrypto.pbkdf2(
      pin,
      salt,
      iterations,
      PBKDF2_KEY_LEN,
      PBKDF2_DIGEST,
      cb as unknown as Parameters<typeof QuickCrypto.pbkdf2>[5],
    );
  });
}

/**
 * Constant-time string comparison for hex hash values. Avoids leaking
 * information via short-circuit evaluation. Bitwise ops are required here
 * so we intentionally disable the `no-bitwise` rule on the hot line.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    // eslint-disable-next-line no-bitwise
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function assertValidPin(pin: string, length: PinLength): void {
  if (pin.length !== length) {
    throw new Error(`PIN must be exactly ${length} characters in length`);
  }
  if (!/^\d+$/.test(pin)) {
    throw new Error('PIN must contain only digits');
  }
}

function isValidRecord(raw: unknown): raw is StoredPinRecord {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const r = raw as Partial<StoredPinRecordV2>;
  if (typeof r.salt !== 'string' || typeof r.hash !== 'string') {
    return false;
  }
  if (r.length !== 4 && r.length !== 6) {
    return false;
  }
  if (r.v === 2) {
    return typeof r.iterations === 'number' && r.iterations > 0;
  }
  return r.v === undefined;
}

async function readStoredRecord(): Promise<StoredPinRecord | null> {
  const entry = await Keychain.getGenericPassword({
    service: PIN_KEYCHAIN_SERVICE,
  });
  if (!entry || typeof entry === 'boolean') {
    return null;
  }
  try {
    const parsed = JSON.parse(entry.password);
    return isValidRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeV2Record(
  pin: string,
  length: PinLength,
): Promise<StoredPinRecordV2> {
  const salt = generateSalt();
  const hash = await pbkdf2Hex(pin, salt, PIN_PBKDF2_ITERATIONS);
  const record: StoredPinRecordV2 = {
    v: 2,
    salt,
    hash,
    length,
    iterations: PIN_PBKDF2_ITERATIONS,
  };
  await Keychain.setGenericPassword('pin', JSON.stringify(record), {
    service: PIN_KEYCHAIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
  return record;
}

export async function setPin(pin: string, length: PinLength): Promise<void> {
  assertValidPin(pin, length);
  await writeV2Record(pin, length);
}

async function verifyAgainstRecord(
  pin: string,
  record: StoredPinRecord,
): Promise<boolean> {
  if (pin.length !== record.length) {
    return false;
  }
  if (isV2(record)) {
    const candidate = await pbkdf2Hex(pin, record.salt, record.iterations);
    return timingSafeEqual(candidate, record.hash);
  }
  const candidate = legacyHashV1(record.salt, pin);
  return timingSafeEqual(candidate, record.hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const record = await readStoredRecord();
  if (!record) {
    return false;
  }
  const ok = await verifyAgainstRecord(pin, record);
  if (ok && !isV2(record)) {
    try {
      await writeV2Record(pin, record.length);
    } catch {
      /* migration is best-effort; the legacy record still works */
    }
  }
  return ok;
}

export async function hasPin(): Promise<boolean> {
  const record = await readStoredRecord();
  return record !== null;
}

export async function getStoredPinLength(): Promise<PinLength | null> {
  const record = await readStoredRecord();
  return record?.length ?? null;
}

export async function clearPin(): Promise<void> {
  await Keychain.resetGenericPassword({service: PIN_KEYCHAIN_SERVICE});
}

/**
 * Atomically rotate the stored PIN after verifying the caller knows the
 * current one. Returns `{ok: false, error: 'wrong-pin'}` without side effects
 * if the old PIN doesn't match, so callers can drive UI retry / lockout
 * without leaking partial state.
 */
export async function changePin(
  oldPin: string,
  newPin: string,
  newLength: PinLength,
): Promise<ChangePinResult> {
  assertValidPin(newPin, newLength);
  const record = await readStoredRecord();
  if (!record) {
    return {ok: false, error: 'wrong-pin'};
  }
  const ok = await verifyAgainstRecord(oldPin, record);
  if (!ok) {
    return {ok: false, error: 'wrong-pin'};
  }
  await writeV2Record(newPin, newLength);
  return {ok: true};
}
