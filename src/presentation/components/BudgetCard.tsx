import React, {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import type {BudgetProgressStatus} from '@domain/usecases/calculate-budget-progress';

const PRESS_SPRING = {damping: 22, stiffness: 360};

export type BudgetCardProps = {
  budgetId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  currency: string;
  percentage: number;
  status: BudgetProgressStatus;
  period: string;
  rollover: boolean;
  onPress?: (id: string) => void;
  testID?: string;
};

function statusColor(
  status: BudgetProgressStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'exceeded':
      return colors.danger;
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    default:
      return colors.success;
  }
}

function statusLabel(status: BudgetProgressStatus): string {
  switch (status) {
    case 'exceeded':
      return 'Over budget';
    case 'danger':
      return 'Almost there';
    case 'warning':
      return 'On track';
    default:
      return 'Under budget';
  }
}

function hexWithAlpha(hex: string, alpha: string): string {
  if (hex.length === 7 && hex.startsWith('#')) {
    return `${hex}${alpha}`;
  }
  return hex;
}

export function BudgetCard({
  budgetId,
  categoryName,
  categoryColor,
  amount,
  spent,
  remaining,
  currency,
  percentage,
  status,
  period,
  rollover,
  onPress,
  testID,
}: BudgetCardProps) {
  const {colors, spacing, radius, shadows} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(() => {
    if (onPress) {
      scale.value = withSpring(0.985, PRESS_SPRING);
    }
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress?.(budgetId);
  }, [budgetId, onPress]);

  const barColor = useMemo(
    () => statusColor(status, colors),
    [status, colors],
  );

  const statusText = statusLabel(status);
  const pct = Math.min(percentage, 100);
  const progressValue = pct / 100;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={`${categoryName} budget, ${Math.round(percentage)}% used`}
        accessibilityRole="button"
        disabled={!onPress}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            borderRadius: radius.lg,
            padding: spacing.base,
          },
          shadows.sm,
        ]}
        testID={testID}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <View
              style={[
                styles.colorDot,
                {backgroundColor: categoryColor},
              ]}
            />
            <View style={styles.nameCol}>
              <Text
                numberOfLines={1}
                style={[styles.catName, {color: colors.text}]}>
                {categoryName}
              </Text>
              <Text style={[styles.period, {color: colors.textTertiary}]}>
                {period === 'monthly' ? 'Monthly' : 'Weekly'}
                {rollover ? ' + Rollover' : ''}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              {backgroundColor: hexWithAlpha(barColor, '22')},
            ]}>
            <Text style={[styles.statusText, {color: barColor}]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={[styles.progressRow, {marginTop: spacing.md}]}>
          <ProgressBar
            color={barColor}
            height={10}
            progress={progressValue}
          />
        </View>

        <View style={[styles.amountRow, {marginTop: spacing.sm}]}>
          <View>
            <Text style={[styles.amountLabel, {color: colors.textTertiary}]}>
              Spent
            </Text>
            <Text style={[styles.amountValue, {color: barColor}]}>
              {formatAmountMasked(spent, currency, hide)}
            </Text>
          </View>

          <View style={styles.divider}>
            <Text style={[styles.percentText, {color: colors.textSecondary}]}>
              {Math.round(percentage)}%
            </Text>
          </View>

          <View style={styles.rightAmount}>
            <Text style={[styles.amountLabel, {color: colors.textTertiary}]}>
              Budget
            </Text>
            <Text style={[styles.amountValue, {color: colors.text}]}>
              {formatAmountMasked(amount, currency, hide)}
            </Text>
          </View>
        </View>

        {remaining < 0 && (
          <View
            style={[
              styles.exceededBanner,
              {
                backgroundColor: colors.dangerLight,
                borderRadius: radius.sm,
                marginTop: spacing.sm,
                padding: spacing.sm,
              },
            ]}>
            <Text style={[styles.exceededText, {color: colors.danger}]}>
              Over by {formatAmountMasked(Math.abs(remaining), currency, hide)}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  period: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
  },
  progressRow: {},
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  rightAmount: {
    alignItems: 'flex-end',
  },
  divider: {
    alignItems: 'center',
  },
  percentText: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
  },
  exceededBanner: {
    alignItems: 'center',
  },
  exceededText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
});
