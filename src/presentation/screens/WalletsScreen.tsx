import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
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
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useWallets} from '@presentation/hooks/useWallets';
import {useAppStore} from '@presentation/stores/useAppStore';
import type {WalletsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<WalletsStackParamList>;

const FAB_SIZE = 56;
// Distance from the tab bar's top edge — matches the existing QuickActionsFAB
// pattern. The tab screen's coordinate space already ends above the tab bar,
// so the safe-area inset is already consumed by the tab bar itself.
const FAB_BOTTOM_OFFSET = 20;
const FAB_SIDE_OFFSET = 20;
const FAB_PRESS_SPRING = {damping: 18, stiffness: 320} as const;

export default function WalletsScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {wallets, isLoading, refetch} = useWallets();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();
  const filteredWallets = useMemo(() => {
    if (!trimmedQuery) { return wallets; }
    return wallets.filter((w) =>
      w.name.toLowerCase().includes(trimmedQuery) ||
      w.currency.toLowerCase().includes(trimmedQuery),
    );
  }, [wallets, trimmedQuery]);

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{scale: fabScale.value}],
  }));

  const handleAddWallet = useCallback(() => {
    ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactLight, {
      enableVibrateFallback: true,
    });
    navigation.navigate('CreateWallet');
  }, [navigation]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (refreshTimerRef.current !== undefined) {
        clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );
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

  const activeWallets = filteredWallets.filter((w) => w.isActive);
  const inactiveWallets = filteredWallets.filter((w) => !w.isActive);

  const totalBalance = wallets
    .filter((w) => w.isActive)
    .reduce((sum, w) => sum + w.balance, 0);
  const noMatch = trimmedQuery.length > 0 && filteredWallets.length === 0;

  return (
    <View style={styles.root}>
      <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.base} />

          <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, {color: colors.text}]}>
              Wallets
            </Text>
          </View>

          {wallets.length > 0 && (
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surfaceElevated ?? colors.surface,
                  borderColor: colors.borderLight,
                  borderRadius: radius.md,
                },
              ]}>
              <AppIcon name="magnify" size={18} color={colors.textTertiary} />
              <TextInput
                accessibilityLabel="Search wallets"
                placeholder="Search wallets"
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                style={[styles.searchInput, {color: colors.text}]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear wallet search"
                  hitSlop={8}
                  onPress={() => setQuery('')}>
                  <AppIcon name="close" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          )}

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
          ) : noMatch ? (
            <EmptyState
              title="No wallets match"
              message={`Nothing matches "${query.trim()}". Try a different name or currency code.`}
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

      <Animated.View
        style={[
          styles.fabWrap,
          fabStyle,
          shadows.lg,
          {
            backgroundColor: colors.primary,
            borderRadius: FAB_SIZE / 2,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add wallet"
          accessibilityHint="Create a new wallet"
          onPress={handleAddWallet}
          onPressIn={() => {
            fabScale.value = withSpring(0.92, FAB_PRESS_SPRING);
          }}
          onPressOut={() => {
            fabScale.value = withTiming(1, {duration: 140});
          }}
          android_ripple={{
            color: 'rgba(255,255,255,0.24)',
            borderless: true,
            radius: FAB_SIZE / 2,
          }}
          style={styles.fabPressable}
          hitSlop={8}>
          <AppIcon name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  fabWrap: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: FAB_SIDE_OFFSET,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 20,
    elevation: 8,
  },
  fabPressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    height: 42,
  },
});
