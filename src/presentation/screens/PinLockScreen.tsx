import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {PinPad} from '@presentation/components/PinPad';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {usePinStore} from '@presentation/stores/usePinStore';
import {getStoredPinLength, hasPin, type PinLength} from '@infrastructure/security/pin-service';
import {
  isBiometricAvailable,
  unlockWithBiometric,
} from '@infrastructure/security/biometric-service';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const VERIFY_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Operation timed out')),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  }) as Promise<T>;
}

export default function PinLockScreen() {
  const {colors, radius} = useTheme();
  const verifyPin = usePinStore((s) => s.verifyPin);
  const unlock = usePinStore((s) => s.unlock);
  const biometricEnabled = usePinStore((s) => s.biometricEnabled);

  const [pin, setPin] = useState('');
  const [pinLength, setPinLength] = useState<PinLength>(4);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const autoPromptedRef = useRef(false);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storedLen, supported, pinExists] = await Promise.all([
          getStoredPinLength(),
          isBiometricAvailable(),
          hasPin(),
        ]);
        if (cancelled) {
          return;
        }
        if (!pinExists) {
          await usePinStore.getState().removePin();
          return;
        }
        if (storedLen) {
          setPinLength(storedLen);
        }
        setBiometricSupported(supported);
      } catch {
        /* non-fatal — defaults are safe */
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryBiometric = useCallback(async () => {
    try {
      const bioPin = await unlockWithBiometric();
      if (!bioPin) {
        return;
      }
      const ok = await withTimeout(verifyPin(bioPin), VERIFY_TIMEOUT_MS);
      if (ok) {
        unlock();
      }
    } catch {
      /* biometric cancelled or failed — user can still type PIN */
    }
  }, [unlock, verifyPin]);

  useEffect(() => {
    if (!ready || autoPromptedRef.current) {
      return;
    }
    if (biometricEnabled && biometricSupported && !locked) {
      autoPromptedRef.current = true;
      void tryBiometric();
    }
  }, [ready, biometricEnabled, biometricSupported, locked, tryBiometric]);

  // Guard against concurrent verifies that can be triggered by React StrictMode
  // double-invokes or rapid re-renders. `isVerifying` state alone isn't enough
  // because state updates are async — a ref gives us a synchronous barrier.
  const inFlightRef = useRef(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (pin.length < pinLength || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setIsVerifying(true);
    const capturedPin = pin;

    verifyTimeoutRef.current = setTimeout(() => {
      inFlightRef.current = false;
      setIsVerifying(false);
      setError('Verification timed out. Try again.');
      setPin('');
    }, VERIFY_TIMEOUT_MS);

    // Small retry: Android Keychain can throw transient KeyStoreExceptions
    // right after the app resumes from background. One retry with a short
    // back-off resolves the vast majority of these without impacting UX.
    const verifyWithRetry = async (): Promise<boolean> => {
      try {
        return await withTimeout(verifyPin(capturedPin), VERIFY_TIMEOUT_MS);
      } catch {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 150));
        return withTimeout(verifyPin(capturedPin), VERIFY_TIMEOUT_MS);
      }
    };

    void verifyWithRetry()
      .then((ok) => {
        if (ok) {
          unlock();
          return;
        }
        const next = attemptsRef.current + 1;
        attemptsRef.current = next;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setError('Too many attempts');
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - next} attempts remaining.`);
        }
        setPin('');
      })
      .catch(() => {
        setError('PIN verification failed. Try again.');
        setPin('');
      })
      .finally(() => {
        if (verifyTimeoutRef.current) {
          clearTimeout(verifyTimeoutRef.current);
          verifyTimeoutRef.current = undefined;
        }
        inFlightRef.current = false;
        setIsVerifying(false);
      });
  }, [pin, pinLength, verifyPin, unlock]);

  useEffect(() => {
    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!locked) {
      return;
    }
    let remaining = LOCKOUT_SECONDS;
    setCountdown(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        setCountdown(0);
        attemptsRef.current = 0;
        setAttempts(0);
        setError(null);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [locked]);

  const handleChange = useCallback((val: string) => {
    setError(null);
    setPin(val);
  }, []);

  const subtitleText = locked
    ? `Try again in ${countdown}s`
    : `Enter your ${pinLength}-digit PIN to continue`;

  const showBiometric = biometricEnabled && biometricSupported && !locked;

  const biometricAction = showBiometric ? (
    <Pressable
      accessibilityLabel="Use biometric to unlock"
      accessibilityRole="button"
      onPress={tryBiometric}
      style={[
        styles.bioBtn,
        {
          backgroundColor: colors.primaryLight + '25',
          borderRadius: radius.full,
        },
      ]}>
      <AppIcon name="fingerprint" size={18} color={colors.primary} />
      <Text style={[styles.bioLabel, {color: colors.primary}]}>Use biometric</Text>
    </Pressable>
  ) : null;

  return (
    <View style={styles.root}>
      <PinPad
        title="Enter PIN"
        subtitle={subtitleText}
        pin={pin}
        length={pinLength}
        onPinChange={locked || isVerifying ? () => {} : handleChange}
        error={error}
        footerSlot={biometricAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
});
