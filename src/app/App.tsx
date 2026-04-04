import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {Providers} from './Providers';
import AppNavigator from '@presentation/navigation/AppNavigator';

export default function App() {
  const isDark = useColorScheme() === 'dark';

  return (
    <Providers>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <AppNavigator />
    </Providers>
  );
}
