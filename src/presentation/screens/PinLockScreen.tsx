import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {PinPad} from '@presentation/components/PinPad';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {usePinStore} from '@presentation/stores/usePinStore';
import {getStoredPinLength, hasPin, type PinLength} from '@infrastructure/security/pin-service';
import {
  isBiometricAvailable,
  unlockWithBiometric,
} from '@infrastructure/security/biometric-service';
import {useTheme} from '@shared/theme';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;
const VERIFY_TIMEOUT_MS = 10_000;
// Match the numeric key size so the biometric button visually balances
// its siblings in the 3-column keypad grid.
const BIOMETRIC_KEY_SIZE = 76;
const BIOMETRIC_ICON_SIZE = 30;

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
  const [biometricAuthInFlight, setBiometricAuthInFlight] = useState(false);
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
    setBiometricAuthInFlight(true);
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
    } finally {
      setBiometricAuthInFlight(false);
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

  const biometricSlot = showBiometric ? (
    <BiometricKey
      busy={biometricAuthInFlight}
      disabled={isVerifying || biometricAuthInFlight}
      onPress={tryBiometric}
    />
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
        biometricSlot={biometricSlot}
      />
    </View>
  );
}

type BiometricKeyProps = {
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
};

/**
 * The biometric unlock key. Positioned in the empty bottom-left cell of the
 * keypad (same 76pt size as a numeric key) so it belongs to the keypad grid
 * but reads as the primary call-to-action:
 *
 *   - Filled with `colors.primary`, white fingerprint icon — the only
 *     non-white tile on the screen, so the eye lands here first.
 *   - Sibling "halo" ring pulses softly at rest to invite a tap, and stops
 *     while busy/disabled so the key doesn't fight the system prompt.
 *   - Press-down spring + darker `primaryDark` fill + medium haptic — the
 *     same interaction model as the digits, just with a heavier haptic
 *     because it triggers an OS-level sheet.
 */
function BiometricKey({onPress, busy, disabled}: BiometricKeyProps) {
  const {colors, shadows} = useTheme();
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.45);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const pressedStyle = useAnimatedStyle(() => ({
    backgroundColor:
      pressed.value > 0.5 ? colors.primaryDark : colors.primary,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{scale: haloScale.value}],
    opacity: haloOpacity.value,
  }));

  React.useEffect(() => {
    if (busy || disabled) {
      haloScale.value = withTiming(1, {duration: 150});
      haloOpacity.value = withTiming(0, {duration: 150});
      return;
    }
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.35, {duration: 1100, easing: Easing.out(Easing.quad)}),
        withTiming(1, {duration: 0}),
      ),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 1100, easing: Easing.out(Easing.quad)}),
        withTiming(0.45, {duration: 0}),
      ),
      -1,
      false,
    );
  }, [busy, disabled, haloOpacity, haloScale]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, {damping: 15, stiffness: 300});
    pressed.value = withTiming(1, {duration: 80});
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactMedium, {
      enableVibrateFallback: true,
    });
  }, [pressed, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {damping: 15, stiffness: 300});
    pressed.value = withTiming(0, {duration: 120});
  }, [pressed, scale]);

  return (
    <View style={styles.bioKeyHost}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bioHalo,
          haloStyle,
          {borderColor: colors.primary},
        ]}
      />
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityHint="Opens the device biometric prompt"
          accessibilityLabel="Unlock with biometric"
          accessibilityRole="button"
          accessibilityState={{busy, disabled}}
          disabled={disabled}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}>
          <Animated.View
            style={[
              styles.bioKeyPress,
              shadows.md,
              {shadowColor: colors.primary},
              pressedStyle,
            ]}>
            <AppIcon
              color={colors.onPrimary}
              name="fingerprint"
              size={BIOMETRIC_ICON_SIZE}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  bioKeyHost: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BIOMETRIC_KEY_SIZE,
    height: BIOMETRIC_KEY_SIZE,
  },
  bioKeyPress: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BIOMETRIC_KEY_SIZE,
    height: BIOMETRIC_KEY_SIZE,
    borderRadius: BIOMETRIC_KEY_SIZE / 2,
  },
  bioHalo: {
    position: 'absolute',
    width: BIOMETRIC_KEY_SIZE,
    height: BIOMETRIC_KEY_SIZE,
    borderRadius: BIOMETRIC_KEY_SIZE / 2,
    borderWidth: 2,
  },
});
