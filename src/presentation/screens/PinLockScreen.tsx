import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
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
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  useEffect(() => {
    if (pin.length < pinLength || isVerifying) {
      return;
    }
    setIsVerifying(true);

    // Safety valve: if the native call hangs beyond the timeout, force-reset
    // isVerifying so the user can try again instead of being permanently stuck.
    verifyTimeoutRef.current = setTimeout(() => {
      setIsVerifying(false);
      setError('Verification timed out. Try again.');
      setPin('');
    }, VERIFY_TIMEOUT_MS);

    void withTimeout(verifyPin(pin), VERIFY_TIMEOUT_MS)
      .then((ok) => {
        if (ok) {
          unlock();
        } else {
          const next = attempts + 1;
          setAttempts(next);
          if (next >= MAX_ATTEMPTS) {
            setError('Too many attempts');
          } else {
            setError(`Wrong PIN. ${MAX_ATTEMPTS - next} attempts remaining.`);
          }
          setPin('');
        }
      })
      .catch(() => {
        setError('PIN verification failed. Try again.');
        setPin('');
      })
      .finally(() => {
        if (verifyTimeoutRef.current) {
          clearTimeout(verifyTimeoutRef.current);
        }
        setIsVerifying(false);
      });
  }, [pin, pinLength, verifyPin, unlock, attempts, isVerifying]);

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

  const handleForgotPin = useCallback(() => {
    Alert.alert(
      'Forgot PIN?',
      'If you cleared app cache or data, your PIN may no longer be recoverable. ' +
        'You can reset the PIN lock, but this will remove PIN protection.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset PIN Lock',
          style: 'destructive',
          onPress: async () => {
            const stillHasPin = await hasPin();
            if (!stillHasPin) {
              await usePinStore.getState().removePin();
              return;
            }
            Alert.alert(
              'PIN data still exists',
              'Your PIN is still stored. Please enter the correct PIN to unlock, ' +
                'or clear app data from Android Settings to fully reset.',
            );
          },
        },
      ],
    );
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
        onForgotPin={handleForgotPin}
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
