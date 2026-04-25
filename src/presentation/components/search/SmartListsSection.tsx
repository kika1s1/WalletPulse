import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

// A "smart list" is a one-tap preset that seeds the search input with
// the matching operator query. Tapping "This month" is semantically the
// same as typing `date:this-month` — the input stays authoritative so
// everything else (pagination, filters, saved searches) keeps working.
export type SmartList = {
  id: string;
  label: string;
  query: string;
};

export const DEFAULT_SMART_LISTS: SmartList[] = [
  {id: 'sl-this-month',    label: 'This month',          query: 'date:this-month'},
  {id: 'sl-last-month',    label: 'Last month',          query: 'date:last-month'},
  {id: 'sl-over-100',      label: 'Over 100',            query: 'amount:>100'},
  {id: 'sl-duplicates',    label: 'Possible duplicates', query: ''},
  {id: 'sl-auto-detected', label: 'Auto-detected',       query: '-source:manual'},
  {id: 'sl-this-year',     label: 'This year',           query: 'date:this-year'},
];

export type SmartListsSectionProps = {
  onSelect: (list: SmartList) => void;
  lists?: SmartList[];
};

export function SmartListsSection({
  onSelect,
  lists = DEFAULT_SMART_LISTS,
}: SmartListsSectionProps) {
  const {colors, spacing, radius} = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.heading,
          {
            color: colors.textSecondary,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm,
          },
        ]}>
        SMART LISTS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: spacing.lg, gap: spacing.sm}}>
        {lists.map((list) => (
          <Pressable
            key={list.id}
            accessibilityRole="button"
            accessibilityLabel={list.label}
            onPress={() => onSelect(list)}
            style={({pressed}) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.primary : colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radius.full,
              },
            ]}>
            <Text style={[styles.chipText, {color: colors.text}]}>
              {list.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  heading: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: fontWeight.bold,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
