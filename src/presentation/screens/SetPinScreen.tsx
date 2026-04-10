import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BackButton} from '@presentation/components/common';
import {PinPad} from '@presentation/components/PinPad';
import {usePinStore} from '@presentation/stores/usePinStore';

const PIN_LENGTH = 4;

type Step = 'enter' | 'confirm';

export default function SetPinScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const setPin = usePinStore((s) => s.setPin);

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentPin.length < PIN_LENGTH) return;

    if (step === 'enter') {
      setFirstPin(currentPin);
      setCurrentPin('');
      setStep('confirm');
      setError(null);
    } else {
      if (currentPin === firstPin) {
        setPin(currentPin);
        navigation.goBack();
      } else {
        setError('PINs do not match. Try again.');
        setCurrentPin('');
        setStep('enter');
        setFirstPin('');
      }
    }
  }, [currentPin, step, firstPin, setPin, navigation]);

  const handleChange = useCallback((val: string) => {
    setError(null);
    setCurrentPin(val);
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.cancelBtn, {top: insets.top + 12}]}>
        <BackButton icon="close" />
      </View>
      <PinPad
        title={step === 'enter' ? 'Set Your PIN' : 'Confirm Your PIN'}
        subtitle={
          step === 'enter'
            ? 'Choose a 4-digit PIN to protect your app'
            : 'Re-enter the same PIN to confirm'
        }
        pin={currentPin}
        onPinChange={handleChange}
        error={error}
      />
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
});
