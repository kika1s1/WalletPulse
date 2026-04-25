import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {AppIcon} from './common/AppIcon';
import {Skeleton} from './feedback/Skeleton';

export type BalanceHeaderProps = {
  totalBalance: number;
  currency: string;
  percentChange: number;
  isLoading?: boolean;
};

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function formatDashboardDate(now: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(now);
  } catch {
    return now.toDateString();
  }
}

function formatPercentChange(percent: number): string {
  const abs = Math.abs(percent);
  const core = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return core;
}

export function BalanceHeader({
  totalBalance,
  currency,
  percentChange,
  isLoading = false,
}: BalanceHeaderProps) {
  const {colors, typography, radius, spacing} = useTheme();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const toggleHideAmounts = useSettingsStore((s) => s.toggleHideAmounts);
  const reduceMotion = useReducedMotion();
  const isFirstMount = useRef(true);
  const balanceSv = useSharedValue(totalBalance);
  const [balanceLabel, setBalanceLabel] = useState(() =>
    formatAmount(totalBalance, currency),
  );

  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return 'en-US';
    }
  }, []);

  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => greetingForHour(now.getHours()), [now]);
  const dateLine = useMemo(() => formatDashboardDate(now, locale), [now, locale]);

  const syncLabel = useCallback(
    (cents: number) => {
      setBalanceLabel(formatAmount(Math.round(cents), currency));
    },
    [currency],
  );

  useAnimatedReaction(
    () => balanceSv.value,
    (value) => {
      runOnJS(syncLabel)(value);
    },
    [currency, syncLabel],
  );

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      balanceSv.value = totalBalance;
      syncLabel(totalBalance);
      return;
    }
    if (reduceMotion) {
      balanceSv.value = totalBalance;
      syncLabel(totalBalance);
      return;
    }
    balanceSv.value = withTiming(totalBalance, {duration: 600});
  }, [balanceSv, reduceMotion, syncLabel, totalBalance]);

  useEffect(() => {
    syncLabel(balanceSv.value);
  }, [balanceSv, currency, syncLabel]);

  const changeVisual = useMemo(() => {
    if (percentChange > 0) {
      return {
        bg: colors.dangerLight,
        fg: colors.danger,
        icon: 'trending-up' as const,
        text: `+${formatPercentChange(percentChange)}% Spending vs last month`,
      };
    }
    if (percentChange < 0) {
      return {
        bg: colors.successLight,
        fg: colors.success,
        icon: 'trending-down' as const,
        text: `-${formatPercentChange(percentChange)}% Spending vs last month`,
      };
    }
    return {
      bg: colors.surfaceElevated,
      fg: colors.textSecondary,
      icon: 'trending-neutral' as const,
      text: 'Spending unchanged vs last month',
    };
  }, [colors.danger, colors.dangerLight, colors.success, colors.successLight, colors.surfaceElevated, colors.textSecondary, percentChange]);

  const changeA11yLabel = useMemo(() => {
    if (percentChange > 0) {
      return `Spending up ${formatPercentChange(percentChange)} percent versus last month`;
    }
    if (percentChange < 0) {
      return `Spending down ${formatPercentChange(percentChange)} percent versus last month`;
    }
    return 'Spending unchanged versus last month';
  }, [percentChange]);

  if (isLoading) {
    return (
      <View
        style={styles.root}
        accessibilityRole="header"
        accessibilityLabel="Balance summary loading"
        accessible
      >
        <Skeleton width={160} height={18} borderRadius={radius.sm} />
        <View style={{height: spacing.xs}} />
        <Skeleton width={220} height={14} borderRadius={radius.sm} />
        <View style={{height: spacing.md}} />
        <Skeleton width="100%" height={40} borderRadius={radius.sm} style={{maxWidth: 280}} />
        <View style={{height: spacing.sm}} />
        <Skeleton width={200} height={28} borderRadius={radius.full} />
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${greeting}. Total balance ${balanceLabel}. ${changeA11yLabel}`}
    >
      <Text
        style={[typography.title3, {color: colors.text}]}
        importantForAccessibility="no"
        maxFontSizeMultiplier={1.4}
      >
        {greeting}
      </Text>
      <Text
        style={[typography.footnote, styles.dateLine, {color: colors.textSecondary}]}
        importantForAccessibility="no"
        maxFontSizeMultiplier={1.4}
      >
        {dateLine}
      </Text>
      <View style={styles.balanceRow}>
        <Text
          style={[styles.balance, {color: colors.text}]}
          importantForAccessibility="no"
          maxFontSizeMultiplier={1.3}
        >
          {hideAmounts ? `•••••• ${currency}` : balanceLabel}
        </Text>
        <Pressable
          accessibilityLabel={hideAmounts ? 'Show amounts' : 'Hide amounts'}
          accessibilityRole="button"
          hitSlop={12}
          onPress={toggleHideAmounts}
          style={styles.eyeBtn}>
          <AppIcon
            name={hideAmounts ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
      <View
        style={[
          styles.changePill,
          {
            backgroundColor: changeVisual.bg,
            borderRadius: radius.full,
            paddingHorizontal: 12,
            paddingVertical: 4,
            alignSelf: 'flex-start',
          },
        ]}
        importantForAccessibility="no"
      >
        <AppIcon
          name={changeVisual.icon}
          size={14}
          color={changeVisual.fg}
        />
        <Text
          style={[typography.footnote, {color: changeVisual.fg, fontWeight: fontWeight.semibold}]}
          importantForAccessibility="no"
          maxFontSizeMultiplier={1.4}
        >
          {changeVisual.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  dateLine: {
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  balance: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  eyeBtn: {
    padding: 4,
  },
  changePill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
