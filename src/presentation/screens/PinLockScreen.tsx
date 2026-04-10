import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {PinPad} from '@presentation/components/PinPad';
import {usePinStore} from '@presentation/stores/usePinStore';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;

export default function PinLockScreen() {
  const verifyPin = usePinStore((s) => s.verifyPin);
  const unlock = usePinStore((s) => s.unlock);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (pin.length < PIN_LENGTH) {return;}

    if (verifyPin(pin)) {
      unlock();
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError(`Too many attempts. Try again later.`);
      } else {
        setError(`Wrong PIN. ${MAX_ATTEMPTS - next} attempts remaining.`);
      }
      setPin('');
    }
  }, [pin, verifyPin, unlock, attempts]);

  const handleChange = useCallback((val: string) => {
    setError(null);
    setPin(val);
  }, []);

  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (!locked) {return;}
    const timer = setTimeout(() => {
      setAttempts(0);
      setError(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [locked]);

  return (
    <View style={styles.root}>
      <PinPad
        title="Enter PIN"
        subtitle={locked ? 'Locked for 30 seconds' : 'Enter your 4-digit PIN to continue'}
        pin={pin}
        onPinChange={locked ? () => {} : handleChange}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
