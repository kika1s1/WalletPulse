import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';

export type BadgeProps = {
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
};

export function Badge({label, variant = 'default', size = 'md'}: BadgeProps) {
  const {colors, radius} = useTheme();

  const palette = {
    default: {bg: colors.surfaceElevated, fg: colors.text},
    success: {bg: colors.successLight, fg: colors.success},
    danger: {bg: colors.dangerLight, fg: colors.danger},
    warning: {bg: colors.warningLight, fg: colors.warning},
    info: {bg: colors.primaryLight, fg: colors.primary},
  }[variant];

  const dim =
    size === 'sm'
      ? {height: 20, fontSize: 11, padH: 6}
      : {height: 24, fontSize: 13, padH: 8};

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="text"
      accessible
      style={[
        styles.badge,
        {
          backgroundColor: palette.bg,
          borderRadius: radius.full,
          height: dim.height,
          minWidth: dim.height,
          paddingHorizontal: dim.padH,
        },
      ]}>
      <Text style={[styles.label, {color: palette.fg, fontSize: dim.fontSize}]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  label: {
    fontWeight: '600',
  },
});
