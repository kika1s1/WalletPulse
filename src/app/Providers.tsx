import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DatabaseProvider} from '@nozbe/watermelondb/react';
import {ThemeProvider} from '@shared/theme';
import database from '@data/database';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

type Props = {
  children: React.ReactNode;
};

export function Providers({children}: Props) {
  const themeMode = useSettingsStore(s => s.themeMode);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <DatabaseProvider database={database}>
          <ThemeProvider themeMode={themeMode}>{children}</ThemeProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
