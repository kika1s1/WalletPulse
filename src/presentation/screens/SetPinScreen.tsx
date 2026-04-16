import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BackButton} from '@presentation/components/common';
import {PinPad} from '@presentation/components/PinPad';
import {usePinStore} from '@presentation/stores/usePinStore';
import {getStoredPinLength} from '@infrastructure/security/pin-service';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

type Length = 4 | 6;
type Step = 'verifyOld' | 'enterNew' | 'confirmNew';

const MAX_OLD_PIN_ATTEMPTS = 5;
const OLD_PIN_LOCKOUT_SECONDS = 30;

/**
 * Guard rail against a hung native keystore / crypto call. The normal PBKDF2
 * path completes in well under a second; anything above the ceiling here
 * almost certainly means the native module is missing or deadlocked, so we
 * surface an error instead of leaving the user on a frozen "Confirm" screen.
 */
const SAVE_PIN_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(
          `${label} did not complete within ${Math.round(ms / 1000)}s. ` +
            `This usually means the app needs to be fully rebuilt (not just JS-reloaded) ` +
            `after installing new native modules.`,
        ),
      );
    }, ms);
  });
  return Promise.race([promise, timer]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  }) as Promise<T>;
}

export default function SetPinScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius} = useTheme();

  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const setPin = usePinStore((s) => s.setPin);
  const changePin = usePinStore((s) => s.changePin);
  const verifyPin = usePinStore((s) => s.verifyPin);

  const [length, setLength] = useState<Length>(4);
  const [step, setStep] = useState<Step>(isPinEnabled ? 'verifyOld' : 'enterNew');
  const [oldPin, setOldPin] = useState('');
  const [firstNew, setFirstNew] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const verifyingRef = useRef(false);

  // When changing an existing PIN, start out at the current stored length so
  // the dots row matches what the user expects to type.
  useEffect(() => {
    if (!isPinEnabled) {
      return;
    }
    let cancelled = false;
    void getStoredPinLength().then((stored) => {
      if (!cancelled && stored) {
        setLength(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isPinEnabled]);

  const locked = attempts >= MAX_OLD_PIN_ATTEMPTS;

  // Lockout countdown for failed old-PIN attempts.
  useEffect(() => {
    if (!locked) {
      return;
    }
    let remaining = OLD_PIN_LOCKOUT_SECONDS;
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

  const resetToEnterNew = useCallback(() => {
    setCurrentPin('');
    setFirstNew('');
    setStep('enterNew');
  }, []);

  const finishChange = useCallback(
    async (oldPinArg: string, confirmedNewPin: string) => {
      setBusy(true);
      try {
        const result = await withTimeout(
          changePin(oldPinArg, confirmedNewPin, length),
          SAVE_PIN_TIMEOUT_MS,
          'Changing PIN',
        );
        if (!result.ok) {
          // Should be impossible: we verified oldPin before reaching this step.
          setError('Could not change PIN. Please try again.');
          setAttempts(0);
          setOldPin('');
          setFirstNew('');
          setCurrentPin('');
          setStep('verifyOld');
          return;
        }
        navigation.goBack();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save PIN';
        Alert.alert('Could not set PIN', message);
        resetToEnterNew();
      } finally {
        setBusy(false);
      }
    },
    [changePin, length, navigation, resetToEnterNew],
  );

  const finishInitial = useCallback(
    async (confirmedNewPin: string) => {
      setBusy(true);
      try {
        await withTimeout(
          setPin(confirmedNewPin, length),
          SAVE_PIN_TIMEOUT_MS,
          'Saving PIN',
        );
        navigation.goBack();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save PIN';
        Alert.alert('Could not set PIN', message);
        resetToEnterNew();
      } finally {
        setBusy(false);
      }
    },
    [setPin, length, navigation, resetToEnterNew],
  );

  // Advance the state machine as digits come in.
  useEffect(() => {
    if (locked || busy || currentPin.length < length) {
      return;
    }

    if (step === 'verifyOld') {
      if (verifyingRef.current) {
        return;
      }
      verifyingRef.current = true;
      void (async () => {
        try {
          const ok = await verifyPin(currentPin);
          if (ok) {
            setOldPin(currentPin);
            setCurrentPin('');
            setAttempts(0);
            setError(null);
            setStep('enterNew');
            return;
          }
          const next = attempts + 1;
          setAttempts(next);
          setCurrentPin('');
          if (next >= MAX_OLD_PIN_ATTEMPTS) {
            setError('Too many attempts');
          } else {
            setError(
              `Wrong PIN. ${MAX_OLD_PIN_ATTEMPTS - next} attempts remaining.`,
            );
          }
        } finally {
          verifyingRef.current = false;
        }
      })();
      return;
    }

    if (step === 'enterNew') {
      setFirstNew(currentPin);
      setCurrentPin('');
      setStep('confirmNew');
      setError(null);
      return;
    }

    if (step === 'confirmNew') {
      if (currentPin !== firstNew) {
        setError('PINs do not match. Try again.');
        resetToEnterNew();
        return;
      }
      const confirmed = currentPin;
      if (isPinEnabled) {
        void finishChange(oldPin, confirmed);
      } else {
        void finishInitial(confirmed);
      }
    }
  }, [
    currentPin,
    step,
    length,
    firstNew,
    oldPin,
    isPinEnabled,
    verifyPin,
    finishChange,
    finishInitial,
    resetToEnterNew,
    attempts,
    busy,
    locked,
  ]);

  const handleChange = useCallback(
    (val: string) => {
      if (locked || busy) {
        return;
      }
      setError(null);
      setCurrentPin(val);
    },
    [locked, busy],
  );

  const pickLength = useCallback(
    (next: Length) => {
      if (busy || currentPin.length > 0 || firstNew.length > 0) {
        return;
      }
      setLength(next);
    },
    [busy, currentPin.length, firstNew.length],
  );

  const showLengthPicker = !isPinEnabled && step === 'enterNew';

  const lengthPicker = showLengthPicker ? (
    <View
      style={[
        styles.lengthRow,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          borderRadius: radius.md,
        },
      ]}>
      {([4, 6] as const).map((opt) => {
        const selected = length === opt;
        return (
          <Pressable
            key={opt}
            accessibilityRole="radio"
            accessibilityState={{selected}}
            onPress={() => pickLength(opt)}
            style={[
              styles.lengthBtn,
              {
                backgroundColor: selected ? colors.primary : 'transparent',
                borderRadius: radius.sm,
              },
            ]}>
            <Text
              style={[
                styles.lengthLabel,
                {color: selected ? '#FFFFFF' : colors.textSecondary},
              ]}>
              {opt} digits
            </Text>
          </Pressable>
        );
      })}
    </View>
  ) : null;

  const {title, subtitle} = useMemo(() => {
    if (step === 'verifyOld') {
      if (locked) {
        return {
          title: 'Too many attempts',
          subtitle: `Try again in ${countdown}s`,
        };
      }
      return {
        title: 'Enter Current PIN',
        subtitle: 'Verify your current PIN before setting a new one',
      };
    }
    if (step === 'enterNew') {
      return {
        title: isPinEnabled ? 'Set a New PIN' : 'Set Your PIN',
        subtitle: `Choose a ${length}-digit PIN to protect your app`,
      };
    }
    return {
      title: 'Confirm Your PIN',
      subtitle: 'Re-enter the same PIN to confirm',
    };
  }, [step, length, isPinEnabled, locked, countdown]);

  return (
    <View style={styles.root}>
      <View style={[styles.cancelBtn, {top: insets.top + 12}]}>
        <BackButton icon="close" />
      </View>
      <PinPad
        title={title}
        subtitle={subtitle}
        pin={currentPin}
        length={length}
        onPinChange={handleChange}
        error={error}
        footerSlot={
          showLengthPicker && !busy ? (
            <View style={{alignItems: 'center', marginTop: spacing.xs}}>
              {lengthPicker}
            </View>
          ) : null
        }
      />
      {busy ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          pointerEvents="auto"
          style={[
            styles.busyOverlay,
            {backgroundColor: colors.background + 'CC'},
          ]}>
          <View
            style={[
              styles.busyCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: radius.md,
              },
            ]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.busyLabel, {color: colors.text}]}>
              Saving PIN…
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  cancelBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  lengthRow: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  lengthBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 88,
    alignItems: 'center',
  },
  lengthLabel: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
  },
  busyLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
});
