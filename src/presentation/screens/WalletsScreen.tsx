import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {SectionHeader} from '@presentation/components/layout/SectionHeader';
import {Spacer} from '@presentation/components/layout/Spacer';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {WalletCard} from '@presentation/components/WalletCard';
import {ProBadge} from '@presentation/components/common/ProBadge';
import {UpgradePrompt} from '@presentation/components/common/UpgradePrompt';
import {useWallets} from '@presentation/hooks/useWallets';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {useAppStore} from '@presentation/stores/useAppStore';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';
import type {WalletsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<WalletsStackParamList>;

export default function WalletsScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {wallets, isLoading, refetch} = useWallets();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const {isFree, entitlement} = useEntitlement();
  const maxWallets = entitlement.featureLimits.maxWallets;
  const activeWalletCount = wallets.filter((w) => w.isActive).length;
  const walletLimitReached = isFree && activeWalletCount >= maxWallets;

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  const handleWalletPress = useCallback(
    (id: string) => {
      navigation.navigate('WalletDetail', {walletId: id});
    },
    [navigation],
  );

  const activeWallets = wallets.filter((w) => w.isActive);
  const inactiveWallets = wallets.filter((w) => !w.isActive);

  const totalBalance = activeWallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />

        <View style={styles.titleRow}>
          <Text
            style={[
              styles.screenTitle,
              {color: colors.text},
            ]}>
            Wallets
          </Text>
          <Pressable
            accessibilityLabel="Add wallet"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              if (walletLimitReached) {
                navigateToPaywall('wallet_limit', 'maxWallets');
              } else {
                navigation.navigate('CreateWallet');
              }
            }}
            style={[styles.addBtn, {backgroundColor: colors.primary, borderRadius: radius.sm}]}>
            <View style={styles.addBtnContent}>
              <Text style={styles.addBtnText}>+ Add</Text>
              {isFree && <ProBadge tier="pro" size="small" />}
            </View>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.summaryLoading}>
            <Skeleton width="60%" height={32} borderRadius={radius.sm} />
            <Spacer size={8} />
            <Skeleton width="40%" height={14} borderRadius={radius.sm} />
          </View>
        ) : (
          <View style={styles.summaryBlock}>
            <Text
              style={[styles.totalBalance, {color: colors.text}]}
              accessibilityLabel={`Total balance ${formatAmountMasked(totalBalance, baseCurrency, hide)}`}>
              {formatAmountMasked(totalBalance, baseCurrency, hide)}
            </Text>
            <Text style={[styles.totalLabel, {color: colors.textSecondary}]}>
              Total across {activeWallets.length} active{' '}
              {activeWallets.length === 1 ? 'wallet' : 'wallets'}
            </Text>
          </View>
        )}

        <Spacer size={spacing.lg} />
      </View>

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        {walletLimitReached && (
          <View style={{marginBottom: spacing.md}}>
            <UpgradePrompt
              title={`You have reached the ${maxWallets}-wallet limit`}
              description="Upgrade to Pro for unlimited wallets across all your financial accounts."
              tier="pro"
              onUpgrade={() => navigateToPaywall('wallet_limit', 'maxWallets')}
            />
          </View>
        )}

        {isLoading ? (
          <>
            <SectionHeader title="Active Wallets" />
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.walletGap}>
                <Skeleton
                  width="100%"
                  height={100}
                  borderRadius={radius.xl}
                />
              </View>
            ))}
          </>
        ) : wallets.length === 0 ? (
          <EmptyState
            title="No wallets yet"
            message="Create your first wallet to start tracking expenses across your accounts."
            actionLabel="Add Wallet"
            onAction={() => navigation.navigate('CreateWallet')}
          />
        ) : (
          <>
            {activeWallets.length > 0 && (
              <>
                <SectionHeader title="Active Wallets" />
                {activeWallets.map((w) => (
                  <View key={w.id} style={styles.walletGap}>
                    <WalletCard
                      id={w.id}
                      name={w.name}
                      balance={w.balance}
                      currency={w.currency}
                      icon={w.icon}
                      color={w.color}
                      isActive={w.isActive}
                      onPress={handleWalletPress}
                    />
                  </View>
                ))}
              </>
            )}

            {inactiveWallets.length > 0 && (
              <>
                <Spacer size={spacing.lg} />
                <SectionHeader title="Inactive Wallets" />
                {inactiveWallets.map((w) => (
                  <View key={w.id} style={styles.walletGap}>
                    <WalletCard
                      id={w.id}
                      name={w.name}
                      balance={w.balance}
                      currency={w.currency}
                      icon={w.icon}
                      color={w.color}
                      isActive={w.isActive}
                      onPress={handleWalletPress}
                    />
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>

      <Spacer size={spacing.xl} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {
    alignSelf: 'stretch',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  summaryBlock: {
    marginTop: 8,
  },
  summaryLoading: {
    marginTop: 8,
  },
  totalBalance: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  totalLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  walletGap: {
    marginTop: 10,
  },
});
