import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

type BulkActionBarProps = {
  selectedCount: number;
  onSelectVisible: () => void;
  onChangeCategory: () => void;
  onChangeTags: () => void;
  onDelete?: () => void;
  onClear: () => void;
};

export function BulkActionBar({
  selectedCount,
  onSelectVisible,
  onChangeCategory,
  onChangeTags,
  onDelete,
  onClear,
}: BulkActionBarProps) {
  const {colors, spacing, radius, shadows} = useTheme();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        padding: spacing.sm,
        borderRadius: radius.lg,
        ...shadows.md,
      },
    ]}>
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.count, {color: colors.text}]}>
        {selectedCount} selected
      </Text>
      <View style={styles.actions}>
        <BarButton label="Select visible" onPress={onSelectVisible} color={colors.textSecondary} />
        <BarButton label="Category" onPress={onChangeCategory} color={colors.primary} />
        <BarButton label="Tags" onPress={onChangeTags} color={colors.primary} />
        {onDelete ? (
          <BarButton label="Delete" onPress={onDelete} color={colors.danger} />
        ) : null}
        <BarButton label="Clear" onPress={onClear} color={colors.textSecondary} />
      </View>
    </View>
  );
}

function BarButton({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.button, {opacity: pressed ? 0.7 : 1}]}>
      <Text style={[styles.buttonText, {color}]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  count: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
