import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {ListRenderItemInfo} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type {Wallet} from '@domain/entities/Wallet';
import {useTheme} from '@shared/theme';
import {AppIcon} from './AppIcon';

export type WalletPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (walletId: string) => void;
  wallets: Wallet[];
  selectedWalletId?: string;
  excludeWalletIds?: string[];
  title?: string;
  testID?: string;
};

type Row = {id: string; wallet: Wallet};

function filterWallets(
  wallets: Wallet[],
  query: string,
  exclude: Set<string>,
): Row[] {
  const q = query.trim().toLowerCase();
  return wallets
    .filter((w) => !exclude.has(w.id))
    .filter((w) => {
      if (!q) {
        return true;
      }
      return (
        w.name.toLowerCase().includes(q) ||
        w.currency.toLowerCase().includes(q)
      );
    })
    .map((w) => ({id: w.id, wallet: w}))
    .sort((a, b) => a.wallet.name.localeCompare(b.wallet.name));
}

export function WalletPicker({
  visible,
  onClose,
  onSelect,
  wallets,
  selectedWalletId,
  excludeWalletIds = [],
  title = 'Choose wallet',
  testID,
}: WalletPickerProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const [search, setSearch] = useState('');

  const exclude = useMemo(() => new Set(excludeWalletIds), [excludeWalletIds]);

  const data = useMemo(
    () => filterWallets(wallets, search, exclude),
    [wallets, search, exclude],
  );

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const sheetIndex = visible ? 0 : -1;

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

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
    ({item}: ListRenderItemInfo<Row>) => {
      const {wallet} = item;
      const selected = wallet.id === selectedWalletId;
      const selectedBg = `${colors.primaryLight}26`;

      return (
        <View style={[styles.rowWrap, {paddingHorizontal: spacing.md}]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => {
              onSelect(wallet.id);
              sheetRef.current?.close();
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
            testID={testID ? `${testID}-row-${wallet.id}` : undefined}>
            <View style={[styles.dot, {backgroundColor: wallet.color}]} />
            <View style={styles.rowCenter}>
              <Text
                numberOfLines={1}
                style={[typography.body, {color: colors.text, fontWeight: selected ? '600' : '400'}]}>
                {wallet.name}
              </Text>
              <Text style={[typography.caption, {color: colors.textTertiary, marginTop: 2}]}>
                {wallet.currency}
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
      colors.textTertiary,
      onSelect,
      radius.md,
      selectedWalletId,
      spacing.md,
      spacing.sm,
      testID,
      typography.body,
      typography.caption,
    ],
  );

  const keyExtractor = useCallback((item: Row) => item.id, []);

  return (
    <BottomSheet
      ref={sheetRef}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      enablePanDownToClose
      index={sheetIndex}
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}
      snapPoints={['55%', '85%']}>
      <BottomSheetView style={styles.sheetBody} testID={testID}>
        <Text
          style={[
            typography.title3,
            {color: colors.text, paddingHorizontal: spacing.md, marginBottom: spacing.sm},
          ]}>
          {title}
        </Text>
        <View
          style={[
            styles.searchShell,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.md,
              marginHorizontal: spacing.md,
              marginBottom: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}>
          <AppIcon name="magnify" size={18} color={colors.textTertiary} />
          <BottomSheetTextInput
            placeholder="Search wallet"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, {color: colors.text}, typography.body]}
            value={search}
            onChangeText={setSearch}
            testID={testID ? `${testID}-search` : undefined}
          />
        </View>
        <BottomSheetFlatList
          data={data}
          extraData={`${selectedWalletId ?? ''}-${search}`}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <Text
              style={[
                typography.body,
                {color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.lg},
              ]}>
              No wallets match
            </Text>
          }
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
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
  },
  rowWrap: {
    paddingBottom: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dot: {
    borderRadius: 999,
    height: 14,
    marginRight: 12,
    width: 14,
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
