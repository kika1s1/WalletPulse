import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider} from '@shared/theme';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

type Props = {
  children: React.ReactNode;
};

const ROOT_STYLE = {flex: 1} as const;

export function Providers({children}: Props) {
  const themeMode = useSettingsStore(s => s.themeMode);
  const activeThemeId = useSettingsStore(s => s.activeThemeId);

  return (
    <GestureHandlerRootView style={ROOT_STYLE}>
      <SafeAreaProvider>
        <ThemeProvider themeMode={themeMode} themeId={activeThemeId}>
          {children}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
