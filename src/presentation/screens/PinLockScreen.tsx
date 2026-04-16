import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {PinPad} from '@presentation/components/PinPad';
import {usePinStore} from '@presentation/stores/usePinStore';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function PinLockScreen() {
  const verifyPin = usePinStore(s => s.verifyPin);
  const unlock = usePinStore(s => s.unlock);
  const removePin = usePinStore(s => s.removePin);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (pin.length < PIN_LENGTH) {
      return;
    }

    if (verifyPin(pin)) {
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
  }, [pin, verifyPin, unlock, attempts]);

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
      'Reset PIN',
      'This will remove your PIN lock. You can set a new PIN from Settings.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            removePin();
            unlock();
          },
        },
      ],
    );
  }, [removePin, unlock]);

  const subtitleText = locked
    ? `Try again in ${countdown}s`
    : 'Enter your 4-digit PIN to continue';

  return (
    <View style={styles.root}>
      <PinPad
        title="Enter PIN"
        subtitle={subtitleText}
        pin={pin}
        onPinChange={locked ? () => {} : handleChange}
        error={error}
        onForgotPin={handleForgotPin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
