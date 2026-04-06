import React, {useCallback, useEffect, useState} from 'react';
import {AppState, StatusBar, View, StyleSheet} from 'react-native';
import {Providers} from './Providers';
import AppNavigator from '@presentation/navigation/AppNavigator';
import {SplashScreen} from '@presentation/components/SplashScreen';
import PinLockScreen from '@presentation/screens/PinLockScreen';
import {usePinStore} from '@presentation/stores/usePinStore';
import {useTheme} from '@shared/theme';

function AppContent() {
  const {isDark} = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const isLocked = usePinStore((s) => s.isLocked);
  const lock = usePinStore((s) => s.lock);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && isPinEnabled) {
        lock();
      }
    });
    return () => sub.remove();
  }, [isPinEnabled, lock]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  const showLock = splashDone && isPinEnabled && isLocked;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={splashDone && !showLock ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor={splashDone && !showLock ? 'transparent' : '#6C5CE7'}
        translucent={splashDone && !showLock}
      />
      {showLock ? <PinLockScreen /> : <AppNavigator />}
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
    </View>
  );
}

export default function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
