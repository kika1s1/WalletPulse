import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import type {BudgetProgressItem} from '@presentation/hooks/useBudgetProgress';

export type BudgetSummaryWidgetProps = {
  items: BudgetProgressItem[];
  totalBudget: number;
  totalSpent: number;
  currency: string;
  onPress?: () => void;
};

function MiniBar({
  name,
  color,
  spent,
  budget,
  barColor,
}: {
  name: string;
  color: string;
  spent: number;
  budget: number;
  barColor: string;
}) {
  const {colors} = useTheme();
  const pct = budget > 0 ? spent / budget : 0;

  return (
    <View style={styles.miniRow}>
      <View style={styles.miniLeft}>
        <View style={[styles.miniDot, {backgroundColor: color}]} />
        <Text
          numberOfLines={1}
          style={[styles.miniName, {color: colors.text}]}>
          {name}
        </Text>
      </View>
      <View style={styles.miniRight}>
        <View style={styles.miniBar}>
          <ProgressBar color={barColor} height={6} progress={pct} />
        </View>
        <Text style={[styles.miniPct, {color: colors.textSecondary}]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
    </View>
  );
}

function resolveBarColor(
  pct: number,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (pct > 1) {
    return colors.danger;
  }
  if (pct >= 0.8) {
    return colors.danger;
  }
  if (pct >= 0.5) {
    return colors.warning;
  }
  return colors.success;
}

export function BudgetSummaryWidget({
  items,
  totalBudget,
  totalSpent,
  currency,
  onPress,
}: BudgetSummaryWidgetProps) {
  const {colors, spacing, radius, shadows} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);

  if (items.length === 0) {
    return null;
  }

  const totalPct = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const overallBarColor = resolveBarColor(totalPct, colors);
  const top3 = items.slice(0, 3);

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          borderRadius: radius.lg,
          padding: spacing.base,
        },
        shadows.sm,
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.text}]}>Budget Health</Text>
        <Text style={[styles.headerPct, {color: overallBarColor}]}>
          {Math.round(totalPct * 100)}% used
        </Text>
      </View>

      <View style={{marginTop: spacing.sm}}>
        <ProgressBar color={overallBarColor} height={10} progress={totalPct} />
      </View>

      <View style={[styles.amountRow, {marginTop: spacing.sm}]}>
        <Text style={[styles.amountText, {color: overallBarColor}]}>
          {formatAmountMasked(totalSpent, currency, hide)}
        </Text>
        <Text style={[styles.ofText, {color: colors.textTertiary}]}>
          of {formatAmountMasked(totalBudget, currency, hide)}
        </Text>
      </View>

      {top3.length > 0 && (
        <View style={{marginTop: spacing.md, gap: 8}}>
          {top3.map((item) => {
            const pct = item.budget.amount > 0 ? item.spent / item.budget.amount : 0;
            return (
              <MiniBar
                barColor={resolveBarColor(pct, colors)}
                budget={item.budget.amount}
                color={item.categoryColor}
                key={item.budget.id}
                name={item.categoryName}
                spent={item.spent}
              />
            );
          })}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel="View budgets"
        accessibilityRole="button"
        onPress={onPress}
        style={({pressed}) => (pressed ? {opacity: 0.92} : undefined)}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  headerPct: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  amountText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  ofText: {
    fontSize: 13,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
    minWidth: 0,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniName: {
    fontSize: 12,
    flex: 1,
  },
  miniRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniBar: {
    flex: 1,
  },
  miniPct: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    width: 30,
    textAlign: 'right',
  },
});
