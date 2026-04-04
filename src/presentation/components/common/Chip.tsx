import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';

function hexWithAlpha(hex: string, alphaSuffix: string): string | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!m) {
    return null;
  }
  return `#${m[1]}${alphaSuffix}`;
}

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  testID?: string;
};

export function Chip({
  label,
  selected = false,
  onPress,
  color,
  icon,
  size = 'md',
  testID,
}: ChipProps) {
  const {colors, radius} = useTheme();

  const isSm = size === 'sm';
  const chipHeight = isSm ? 28 : 34;
  const fontSize = isSm ? 12 : 14;
  const paddingHorizontal = isSm ? 10 : 14;

  const custom = Boolean(color);
  const tinted = custom && color ? hexWithAlpha(color, '1F') : null;
  const bgColor = selected
    ? custom && tinted
      ? tinted
      : colors.primaryLight
    : colors.surfaceElevated;
  const borderColor = selected ? (custom && color ? color : colors.primary) : colors.border;
  const textColor = selected ? (custom && color ? color : colors.primary) : colors.text;

  const content = (
    <>
      {icon ? (
        <View style={styles.iconWrap} importantForAccessibility="no">
          {icon}
        </View>
      ) : null}
      <Text style={[styles.labelText, {fontSize, color: textColor}]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={selected ? 'Double tap to deselect' : 'Double tap to select'}
        accessibilityState={{selected, disabled: false}}
        onPress={onPress}
        style={({pressed}) => [
          styles.base,
          {
            height: chipHeight,
            paddingHorizontal,
            backgroundColor: bgColor,
            borderColor,
            borderRadius: radius.full,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        testID={testID}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={label}
      accessibilityState={{selected}}
      style={[
        styles.base,
        {
          height: chipHeight,
          paddingHorizontal,
          backgroundColor: bgColor,
          borderColor,
          borderRadius: radius.full,
        },
      ]}
      testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    gap: 6,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontWeight: '600',
  },
});
