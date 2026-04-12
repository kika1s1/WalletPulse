export const colors = {
  light: {
    background: '#FAFBFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    primaryDark: '#5A4BD1',
    onPrimary: '#FFFFFF',
    text: '#1A1D1F',
    textSecondary: '#6F767E',
    textTertiary: '#9A9FA5',
    textMuted: '#B2BEC3',
    border: '#EFEFEF',
    borderLight: '#F4F4F4',
    success: '#83BF6E',
    successLight: '#EAFBE7',
    danger: '#FF6A55',
    dangerLight: '#FFEEEB',
    warning: '#FFB800',
    warningLight: '#FFF8E6',
    income: '#83BF6E',
    expense: '#FF6A55',
    transfer: '#6C5CE7',
    skeleton: '#F0F0F0',
    shimmer: '#E8E8E8',
    overlay: 'rgba(0,0,0,0.5)',
    card: '#FFFFFF',
  },
  dark: {
    background: '#111315',
    surface: '#1A1D1F',
    surfaceElevated: '#272B30',
    primary: '#8B7FF5',
    primaryLight: '#A29BFE',
    primaryDark: '#6C5CE7',
    onPrimary: '#FFFFFF',
    text: '#FCFCFC',
    textSecondary: '#9A9FA5',
    textTertiary: '#6F767E',
    textMuted: '#B2BEC3',
    border: '#272B30',
    borderLight: '#33383F',
    success: '#83BF6E',
    successLight: '#1A2E15',
    danger: '#FF6A55',
    dangerLight: '#2E1A15',
    warning: '#FFB800',
    warningLight: '#2E2815',
    income: '#83BF6E',
    expense: '#FF6A55',
    transfer: '#8B7FF5',
    skeleton: '#272B30',
    shimmer: '#33383F',
    overlay: 'rgba(0,0,0,0.7)',
    card: '#1A1D1F',
  },
} as const;

export type ColorTheme = typeof colors.light | typeof colors.dark;

export type ThemeId =
  | 'default'
  | 'theme_midnight_oled'
  | 'theme_ocean_depth'
  | 'theme_forest'
  | 'theme_sunset'
  | 'theme_minimal_ink'
  | 'theme_neon_finance';

type ThemePalette = {light: ColorTheme; dark: ColorTheme};

const midnightOled: ThemePalette = {
  light: {
    ...colors.light,
    primary: '#7C4DFF',
    primaryLight: '#B388FF',
    primaryDark: '#651FFF',
    transfer: '#7C4DFF',
  },
  dark: {
    ...colors.dark,
    background: '#000000',
    surface: '#0A0A0A',
    surfaceElevated: '#141414',
    primary: '#B388FF',
    primaryLight: '#D1C4E9',
    primaryDark: '#7C4DFF',
    border: '#1A1A1A',
    borderLight: '#222222',
    skeleton: '#141414',
    shimmer: '#1A1A1A',
    card: '#0A0A0A',
    transfer: '#B388FF',
  },
};

const oceanDepth: ThemePalette = {
  light: {
    ...colors.light,
    background: '#F0F7FF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#1565C0',
    primaryLight: '#42A5F5',
    primaryDark: '#0D47A1',
    border: '#BBDEFB',
    borderLight: '#E3F2FD',
    transfer: '#1565C0',
    card: '#FFFFFF',
  },
  dark: {
    ...colors.dark,
    background: '#0A1929',
    surface: '#0D2137',
    surfaceElevated: '#132F4C',
    primary: '#42A5F5',
    primaryLight: '#90CAF9',
    primaryDark: '#1565C0',
    border: '#132F4C',
    borderLight: '#1A3A5C',
    skeleton: '#132F4C',
    shimmer: '#1A3A5C',
    card: '#0D2137',
    transfer: '#42A5F5',
  },
};

const forest: ThemePalette = {
  light: {
    ...colors.light,
    background: '#F1F8E9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#2E7D32',
    primaryLight: '#66BB6A',
    primaryDark: '#1B5E20',
    border: '#C8E6C9',
    borderLight: '#E8F5E9',
    success: '#43A047',
    successLight: '#E8F5E9',
    transfer: '#2E7D32',
    card: '#FFFFFF',
  },
  dark: {
    ...colors.dark,
    background: '#0D1A0D',
    surface: '#142814',
    surfaceElevated: '#1C3A1C',
    primary: '#66BB6A',
    primaryLight: '#A5D6A7',
    primaryDark: '#2E7D32',
    border: '#1C3A1C',
    borderLight: '#254A25',
    success: '#66BB6A',
    successLight: '#1A2E15',
    skeleton: '#1C3A1C',
    shimmer: '#254A25',
    card: '#142814',
    transfer: '#66BB6A',
  },
};

const sunset: ThemePalette = {
  light: {
    ...colors.light,
    background: '#FFF8F0',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#E65100',
    primaryLight: '#FF8A65',
    primaryDark: '#BF360C',
    border: '#FFCCBC',
    borderLight: '#FBE9E7',
    transfer: '#E65100',
    card: '#FFFFFF',
  },
  dark: {
    ...colors.dark,
    background: '#1A0E08',
    surface: '#2A1508',
    surfaceElevated: '#3A1F0F',
    primary: '#FF8A65',
    primaryLight: '#FFAB91',
    primaryDark: '#E65100',
    border: '#3A1F0F',
    borderLight: '#4A2A15',
    skeleton: '#3A1F0F',
    shimmer: '#4A2A15',
    card: '#2A1508',
    transfer: '#FF8A65',
  },
};

const minimalInk: ThemePalette = {
  light: {
    ...colors.light,
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#212121',
    primaryLight: '#757575',
    primaryDark: '#000000',
    border: '#E0E0E0',
    borderLight: '#F5F5F5',
    transfer: '#424242',
    card: '#FFFFFF',
  },
  dark: {
    ...colors.dark,
    background: '#121212',
    surface: '#1E1E1E',
    surfaceElevated: '#2A2A2A',
    primary: '#E0E0E0',
    primaryLight: '#F5F5F5',
    primaryDark: '#9E9E9E',
    border: '#2A2A2A',
    borderLight: '#333333',
    skeleton: '#2A2A2A',
    shimmer: '#333333',
    card: '#1E1E1E',
    transfer: '#BDBDBD',
  },
};

const neonFinance: ThemePalette = {
  light: {
    ...colors.light,
    primary: '#00BFA5',
    primaryLight: '#64FFDA',
    primaryDark: '#00897B',
    success: '#00E676',
    successLight: '#E0F7EE',
    transfer: '#00BFA5',
  },
  dark: {
    ...colors.dark,
    background: '#0D0D0D',
    surface: '#121212',
    surfaceElevated: '#1A1A1A',
    primary: '#00E5FF',
    primaryLight: '#76FF03',
    primaryDark: '#00B8D4',
    success: '#76FF03',
    successLight: '#0D1A00',
    border: '#1A1A1A',
    borderLight: '#252525',
    skeleton: '#1A1A1A',
    shimmer: '#252525',
    card: '#121212',
    transfer: '#00E5FF',
  },
};

export const themePalettes: Record<ThemeId, ThemePalette> = {
  default: {light: colors.light, dark: colors.dark},
  theme_midnight_oled: midnightOled,
  theme_ocean_depth: oceanDepth,
  theme_forest: forest,
  theme_sunset: sunset,
  theme_minimal_ink: minimalInk,
  theme_neon_finance: neonFinance,
};

export function getThemeColors(themeId: ThemeId, isDark: boolean): ColorTheme {
  const palette = themePalettes[themeId] ?? themePalettes.default;
  return isDark ? palette.dark : palette.light;
}
