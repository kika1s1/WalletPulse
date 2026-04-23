import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import type {SearchSuggestion, SuggestionKind} from '@presentation/hooks/useSearchSuggestions';

export type SuggestionRowProps = {
  suggestion: SearchSuggestion;
  onPress: (suggestion: SearchSuggestion) => void;
};

const KIND_LABEL: Record<SuggestionKind, string> = {
  merchant: 'Merchant',
  tag: 'Tag',
  category: 'Category',
  wallet: 'Wallet',
  operator: 'Operator',
};

export function SuggestionRow({suggestion, onPress}: SuggestionRowProps) {
  const {colors, spacing, radius} = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[suggestion.kind]} ${suggestion.label}`}
      onPress={() => onPress(suggestion)}
      style={({pressed}) => [
        styles.row,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          backgroundColor: pressed ? colors.border : 'transparent',
        },
      ]}>
      <View style={[styles.kindPill, {backgroundColor: colors.primary + '22', borderRadius: radius.sm}]}>
        <Text style={[styles.kindText, {color: colors.primary}]}>
          {KIND_LABEL[suggestion.kind]}
        </Text>
      </View>
      <View style={styles.textColumn}>
        <Text style={[styles.label, {color: colors.text}]} numberOfLines={1}>
          {suggestion.label}
        </Text>
        {suggestion.hint ? (
          <Text style={[styles.hint, {color: colors.textTertiary}]} numberOfLines={1}>
            {suggestion.hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kindPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindText: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: fontWeight.bold,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
  },
});
