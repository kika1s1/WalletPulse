import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {PinPad} from '@presentation/components/PinPad';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {usePinStore} from '@presentation/stores/usePinStore';
import {getStoredPinLength, type PinLength} from '@infrastructure/security/pin-service';
import {
  isBiometricAvailable,
  unlockWithBiometric,
} from '@infrastructure/security/biometric-service';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

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
  const autoPromptRef = useRef(false);

  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedLen, supported] = await Promise.all([
        getStoredPinLength(),
        isBiometricAvailable(),
      ]);
      if (cancelled) {
        return;
      }
      if (storedLen) {
        setPinLength(storedLen);
      }
      setBiometricSupported(supported);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryBiometric = useCallback(async () => {
    const bioPin = await unlockWithBiometric();
    if (!bioPin) {
      return;
    }
    const ok = await verifyPin(bioPin);
    if (ok) {
      unlock();
    }
  }, [unlock, verifyPin]);

  useEffect(() => {
    if (autoPromptRef.current) {
      return;
    }
    if (biometricEnabled && biometricSupported && !locked) {
      autoPromptRef.current = true;
      void tryBiometric();
    }
  }, [biometricEnabled, biometricSupported, locked, tryBiometric]);

  useEffect(() => {
    if (pin.length < pinLength || isVerifying) {
      return;
    }
    setIsVerifying(true);
    void verifyPin(pin)
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
      .finally(() => setIsVerifying(false));
  }, [pin, pinLength, verifyPin, unlock, attempts, isVerifying]);

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

  const subtitleText = locked
    ? `Try again in ${countdown}s`
    : `Enter your ${pinLength}-digit PIN to continue`;

  const biometricAction = biometricEnabled && biometricSupported && !locked ? (
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
        onPinChange={locked ? () => {} : handleChange}
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
