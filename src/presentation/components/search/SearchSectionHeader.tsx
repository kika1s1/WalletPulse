import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

export type SearchSectionHeaderProps = {
  title: string;
  count: number;
};

export function SearchSectionHeader({title, count}: SearchSectionHeaderProps) {
  const {colors, spacing} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
      ]}>
      <Text
        style={[
          styles.title,
          {color: colors.textSecondary},
        ]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.badge, {backgroundColor: colors.border}]}>
        <Text style={[styles.badgeText, {color: colors.textSecondary}]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: fontWeight.bold,
  },
  badge: {
    minWidth: 22,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
});
