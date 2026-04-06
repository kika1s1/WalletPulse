import React, {useCallback, useRef, useEffect} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {AppIcon, resolveIconName} from './common/AppIcon';
import type {Wallet} from '@domain/entities/Wallet';

export type WalletSwitcherItem = {
  id: string | null;
  name: string;
  icon: string;
  color: string;
  currency: string;
  balance: number;
};

export type WalletSwitcherProps = {
  wallets: Wallet[];
  totalBalance: number;
  baseCurrency: string;
  selectedWalletId: string | null;
  onSelect: (walletId: string | null) => void;
};

function buildItems(
  wallets: Wallet[],
  totalBalance: number,
  baseCurrency: string,
): WalletSwitcherItem[] {
  const allItem: WalletSwitcherItem = {
    id: null,
    name: 'All Wallets',
    icon: 'wallet-outline',
    color: '#6C5CE7',
    currency: baseCurrency,
    balance: totalBalance,
  };

  const walletItems: WalletSwitcherItem[] = wallets
    .filter((w) => w.isActive)
    .map((w) => ({
      id: w.id,
      name: w.name,
      icon: w.icon || 'wallet',
      color: w.color || '#6C5CE7',
      currency: w.currency,
      balance: w.balance,
    }));

  return [allItem, ...walletItems];
}

function SwitcherChip({
  item,
  isSelected,
  onPress,
}: {
  item: WalletSwitcherItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const {colors, radius, spacing} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const balanceLabel = formatAmountMasked(item.balance, item.currency, hide);

  return (
    <Pressable
      accessibilityLabel={`${item.name} ${balanceLabel}`}
      accessibilityRole="button"
      accessibilityState={{selected: isSelected}}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: radius.md,
          backgroundColor: isSelected ? item.color : colors.surface,
          borderColor: isSelected ? item.color : colors.borderLight,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.sm,
        },
      ]}>
      <View style={styles.chipIcon}>
        <AppIcon
          name={resolveIconName(item.icon)}
          size={18}
          color={isSelected ? '#FFFFFF' : item.color}
        />
      </View>
      <View style={styles.chipText}>
        <Text
          numberOfLines={1}
          style={[
            styles.chipName,
            {color: isSelected ? '#FFFFFF' : colors.text},
          ]}>
          {item.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.chipBalance,
            {color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textSecondary},
          ]}>
          {balanceLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export function WalletSwitcher({
  wallets,
  totalBalance,
  baseCurrency,
  selectedWalletId,
  onSelect,
}: WalletSwitcherProps) {
  const listRef = useRef<FlatList<WalletSwitcherItem>>(null);
  const items = React.useMemo(
    () => buildItems(wallets, totalBalance, baseCurrency),
    [wallets, totalBalance, baseCurrency],
  );

  const selectedIndex = items.findIndex((i) => i.id === selectedWalletId);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      listRef.current.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewOffset: 16,
      });
    }
  }, [selectedIndex]);

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<WalletSwitcherItem>) => (
      <SwitcherChip
        item={item}
        isSelected={item.id === selectedWalletId}
        onPress={() => onSelect(item.id)}
      />
    ),
    [selectedWalletId, onSelect],
  );

  const keyExtractor = useCallback(
    (item: WalletSwitcherItem) => item.id ?? '__all__',
    [],
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      horizontal
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      onScrollToIndexFailed={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 180,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipText: {
    flex: 1,
    minWidth: 0,
  },
  chipName: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  chipBalance: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginTop: 1,
  },
});
