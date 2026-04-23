import * as Keychain from 'react-native-keychain';

export const BIOMETRIC_KEYCHAIN_SERVICE = 'walletpulse-bio';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const type = await Keychain.getSupportedBiometryType();
    return type !== null && type !== undefined;
  } catch {
    return false;
  }
}

export async function enableBiometric(pin: string): Promise<void> {
  if (!pin || pin.length === 0) {
    throw new Error('PIN is required to enable biometric unlock');
  }
  await Keychain.setGenericPassword('bio-pin', pin, {
    service: BIOMETRIC_KEYCHAIN_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
}

export async function disableBiometric(): Promise<void> {
  await Keychain.resetGenericPassword({service: BIOMETRIC_KEYCHAIN_SERVICE});
}

/**
 * Rewrites the biometric-protected keychain slot with `newPin` when biometric
 * unlock is currently enabled. A no-op otherwise.
 *
 * Use this immediately after a successful PIN change so that biometric unlock
 * continues to unlock with the latest PIN. Safe because the caller must have
 * just verified the old PIN to get here.
 */
export async function reEnrollBiometricIfEnabled(newPin: string): Promise<void> {
  const enabled = await isBiometricEnabled();
  if (!enabled) {
    return;
  }
  await enableBiometric(newPin);
}

export async function isBiometricEnabled(): Promise<boolean> {
  // IMPORTANT: use `hasGenericPassword` — not `getGenericPassword` — because
  // the biometric-protected entry was written with ACCESS_CONTROL.BIOMETRY_ANY,
  // which means any attempt to *read* its value triggers decryption and
  // therefore requires biometric authentication. Merely checking whether the
  // entry exists must not prompt for a fingerprint, otherwise the PIN lock
  // screen would silently decide biometric is disabled whenever it can't
  // decrypt eagerly (UserNotAuthenticatedException is swallowed as false).
  try {
    return await Keychain.hasGenericPassword({
      service: BIOMETRIC_KEYCHAIN_SERVICE,
    });
  } catch {
    return false;
  }
}

/**
 * Triggers the device biometric prompt and returns the stored PIN on success,
 * or null if biometric is disabled or the user cancels. The PIN should then be
 * passed to `verifyPin` from pin-service to complete the unlock.
 */
export async function unlockWithBiometric(): Promise<string | null> {
  try {
    const entry = await Keychain.getGenericPassword({
      service: BIOMETRIC_KEYCHAIN_SERVICE,
      authenticationPrompt: {
        title: 'Unlock WalletPulse',
        subtitle: 'Use your fingerprint or face to unlock',
        cancel: 'Use PIN instead',
      },
    });
    if (!entry || typeof entry === 'boolean') {
      return null;
    }
    return entry.password;
  } catch {
    return null;
  }
}
