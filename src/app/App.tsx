import React, {useCallback, useState} from 'react';
import {StatusBar, useColorScheme, View, StyleSheet} from 'react-native';
import {Providers} from './Providers';
import AppNavigator from '@presentation/navigation/AppNavigator';
import {SplashScreen} from '@presentation/components/SplashScreen';

export default function App() {
  const isDark = useColorScheme() === 'dark';
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <Providers>
      <View style={styles.root}>
        <StatusBar
          barStyle={splashDone ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
          backgroundColor={splashDone ? 'transparent' : '#6C5CE7'}
          translucent={splashDone}
        />
        <AppNavigator />
        {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      </View>
    </Providers>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
