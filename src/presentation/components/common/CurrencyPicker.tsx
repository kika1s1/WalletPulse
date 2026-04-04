import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {ListRenderItemInfo} from '@shopify/flash-list';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlashList,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {CurrencyOption} from '@data/seed/currencies';
import {getCurrencyOptions} from '@data/seed/currencies';
import {POPULAR_CURRENCIES} from '@shared/constants/currencies';
import {useTheme} from '@shared/theme';

export type CurrencyPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selectedCode?: string;
  testID?: string;
};

type ListRow =
  | {kind: 'header'; id: string; title: string}
  | {kind: 'currency'; id: string; option: CurrencyOption};

function buildRows(options: CurrencyOption[], query: string): ListRow[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q),
      )
    : options;

  if (q) {
    return filtered
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((option) => ({
        kind: 'currency' as const,
        id: option.code,
        option,
      }));
  }

  const popular: CurrencyOption[] = [];
  for (const code of POPULAR_CURRENCIES) {
    const found = filtered.find((o) => o.code === code);
    if (found) {
      popular.push(found);
    }
  }

  const popularCodes = new Set(popular.map((p) => p.code));
  const rest = filtered
    .filter((o) => !popularCodes.has(o.code))
    .sort((a, b) => a.name.localeCompare(b.name));

  const rows: ListRow[] = [{kind: 'header', id: 'hdr-popular', title: 'Popular'}];
  for (const option of popular) {
    rows.push({kind: 'currency', id: option.code, option});
  }
  rows.push({kind: 'header', id: 'hdr-all', title: 'All currencies'});
  for (const option of rest) {
    rows.push({kind: 'currency', id: option.code, option});
  }
  return rows;
}

export function CurrencyPicker({
  visible,
  onClose,
  onSelect,
  selectedCode,
  testID,
}: CurrencyPickerProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const [search, setSearch] = useState('');

  const allOptions = useMemo(() => getCurrencyOptions(), []);

  const data = useMemo(
    () => buildRows(allOptions, search),
    [allOptions, search],
  );

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const sheetIndex = visible ? 0 : -1;

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<ListRow>) => {
      if (item.kind === 'header') {
        return (
          <View style={[styles.sectionHeader, {paddingHorizontal: spacing.md}]}>
            <Text style={[typography.caption, {color: colors.textSecondary, fontWeight: '600'}]}>
              {item.title}
            </Text>
          </View>
        );
      }

      const {option} = item;
      const selected = option.code === selectedCode;
      const selectedBg = `${colors.primaryLight}26`;

      return (
        <View style={[styles.rowWrap, {paddingHorizontal: spacing.md}]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => {
              onSelect(option.code);
              onClose();
            }}
            style={({pressed}) => [
              styles.row,
              {
                backgroundColor: selected ? selectedBg : 'transparent',
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radius.md,
                borderWidth: 1,
                opacity: pressed ? 0.92 : 1,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
            testID={testID ? `${testID}-row-${option.code}` : undefined}>
            <Text style={styles.flag}>{option.flag ?? '🏳️'}</Text>
            <View style={styles.rowCenter}>
              <Text
                numberOfLines={1}
                style={[typography.body, {color: colors.text, fontWeight: selected ? '600' : '400'}]}>
                {option.name}
              </Text>
              <Text style={[typography.caption, {color: colors.textTertiary, marginTop: 2}]}>
                {option.code} · {option.symbol}
              </Text>
            </View>
            {selected ? (
              <Text style={[styles.check, {color: colors.primary}]}>✓</Text>
            ) : (
              <View style={styles.checkPlaceholder} />
            )}
          </Pressable>
        </View>
      );
    },
    [
      colors.border,
      colors.primary,
      colors.primaryLight,
      colors.text,
      colors.textSecondary,
      colors.textTertiary,
      onClose,
      onSelect,
      radius.md,
      selectedCode,
      spacing.md,
      spacing.sm,
      testID,
      typography.body,
      typography.caption,
    ],
  );

  const keyExtractor = useCallback((item: ListRow) => item.id, []);

  const getItemType = useCallback((item: ListRow) => item.kind, []);

  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      enablePanDownToClose
      index={sheetIndex}
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}
      snapPoints={['70%', '90%']}>
      <BottomSheetView style={styles.sheetBody} testID={testID}>
        <View style={[styles.searchShell, {backgroundColor: colors.surfaceElevated, borderRadius: radius.md, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border}]}>
          <Text style={[styles.searchIcon, {color: colors.textTertiary}]}>🔍</Text>
          <BottomSheetTextInput
            placeholder="Search name or code"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, {color: colors.text}, typography.body]}
            value={search}
            onChangeText={setSearch}
            testID={testID ? `${testID}-search` : undefined}
          />
        </View>
        <BottomSheetFlashList
          data={data}
          extraData={`${selectedCode ?? ''}-${search}`}
          getItemType={getItemType}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          style={styles.list}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  searchShell: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
  },
  sectionHeader: {
    paddingBottom: 8,
    paddingTop: 12,
  },
  rowWrap: {
    paddingBottom: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  flag: {
    fontSize: 26,
    marginRight: 12,
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  check: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  checkPlaceholder: {
    marginLeft: 8,
    width: 18,
  },
});
