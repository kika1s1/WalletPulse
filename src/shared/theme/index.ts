import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {ColorTheme, getThemeColors, type ThemeId} from './colors';
import {typography} from './typography';
import {spacing} from './spacing';
import {shadows} from './shadows';
import {radius} from './radius';

export type Theme = {
  colors: ColorTheme;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  radius: typeof radius;
  isDark: boolean;
  themeId: ThemeId;
};

const ThemeContext = createContext<Theme | null>(null);

export type ThemeMode = 'light' | 'dark' | 'system';

export function ThemeProvider({
  children,
  themeMode = 'system',
  themeId = 'default',
}: {
  children: React.ReactNode;
  themeMode?: ThemeMode;
  themeId?: ThemeId;
}) {
  const systemScheme = useColorScheme();
  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: getThemeColors(themeId, isDark),
      typography,
      spacing,
      shadows,
      radius,
      isDark,
      themeId,
    }),
    [isDark, themeId],
  );

  return React.createElement(ThemeContext.Provider, {value: theme}, children);
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}

export {colors} from './colors';
export type {ThemeId} from './colors';
export {themePalettes, getThemeColors} from './colors';
export {typography} from './typography';
export {spacing} from './spacing';
export {shadows} from './shadows';
export {radius} from './radius';
