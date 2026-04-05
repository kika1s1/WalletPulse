import React, {useCallback, useState} from 'react';
import {StatusBar, View, StyleSheet} from 'react-native';
import {Providers} from './Providers';
import AppNavigator from '@presentation/navigation/AppNavigator';
import {SplashScreen} from '@presentation/components/SplashScreen';
import {useTheme} from '@shared/theme';

function AppContent() {
  const {isDark} = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={splashDone ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor={splashDone ? 'transparent' : '#6C5CE7'}
        translucent={splashDone}
      />
      <AppNavigator />
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
