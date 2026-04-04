import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {colors, ColorTheme} from './colors';
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
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? colors.dark : colors.light,
      typography,
      spacing,
      shadows,
      radius,
      isDark,
    }),
    [isDark],
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
export {typography} from './typography';
export {spacing} from './spacing';
export {shadows} from './shadows';
export {radius} from './radius';
