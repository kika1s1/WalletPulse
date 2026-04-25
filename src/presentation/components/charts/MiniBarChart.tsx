import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {Card} from '../common/Card';
import {Skeleton} from '../feedback/Skeleton';

export type DayActivity = {
  label: string;
  incomeAmount: number;
  expenseAmount: number;
  isToday?: boolean;
};

export type MiniBarChartProps = {
  data: DayActivity[];
  currency: string;
  isLoading?: boolean;
  onAddPress?: () => void;
};

const CHART_HEIGHT = 140;
const BAR_TOP_RADIUS = 4;
const SKELETON_BAR_COUNT = 7;
const LEGEND_DOT = 8;
const MIN_BAR_HEIGHT = 2;

export function MiniBarChart({data, currency, isLoading, onAddPress}: MiniBarChartProps) {
  const {colors, spacing, radius} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const d of data) {
      income += d.incomeAmount;
      expense += d.expenseAmount;
    }
    return {income, expense};
  }, [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of data) {
      if (d.incomeAmount > max) {max = d.incomeAmount;}
      if (d.expenseAmount > max) {max = d.expenseAmount;}
    }
    return max;
  }, [data]);

  const isEmpty = totals.income === 0 && totals.expense === 0;

  if (isLoading) {
    return (
      <Card padding="md" testID="mini-bar-chart-skeleton">
        <Text style={[styles.sectionTitle, {color: colors.text}]}>This Week</Text>
        <View style={[styles.skeletonRow, {marginTop: spacing.md, height: CHART_HEIGHT}]}>
          {Array.from({length: SKELETON_BAR_COUNT}).map((_, i) => (
            <Skeleton
              key={i}
              borderRadius={BAR_TOP_RADIUS}
              height={CHART_HEIGHT - spacing.lg - spacing.xs}
              width={28}
            />
          ))}
        </View>
        <View style={[styles.totalSkeletonWrap, {marginTop: spacing.md}]}>
          <Skeleton borderRadius={radius.xs} height={14} width="100%" />
        </View>
      </Card>
    );
  }

  return (
    <Card padding="md" testID="mini-bar-chart">
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>This Week</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, {backgroundColor: colors.income}]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[styles.legendText, {color: colors.textSecondary}]}
              accessibilityLabel="Income series"
            >
              Income
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, {backgroundColor: colors.expense}]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[styles.legendText, {color: colors.textSecondary}]}
              accessibilityLabel="Expenses series"
            >
              Expenses
            </Text>
          </View>
        </View>
      </View>

      {isEmpty ? (
        <View style={[styles.emptyChart, {height: CHART_HEIGHT, marginTop: spacing.sm}]}>
          <Text style={[styles.emptyChartText, {color: colors.textSecondary}]}>
            No activity this week. Tap +Expense or +Income to log one.
          </Text>
          {onAddPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a transaction"
              onPress={onAddPress}
              style={({pressed}) => [
                styles.emptyCta,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  opacity: pressed ? 0.8 : 1,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Text style={styles.emptyCtaText}>Add transaction</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={[styles.chartRow, {height: CHART_HEIGHT, marginTop: spacing.sm}]}>
          {data.map((d, i) => {
            const incomeRatio = maxValue > 0 ? d.incomeAmount / maxValue : 0;
            const expenseRatio = maxValue > 0 ? d.expenseAmount / maxValue : 0;
            const opacity = d.isToday ? 1 : 0.7;
            return (
              <View
                key={`${d.label}-${i}`}
                style={styles.dayCol}
                accessibilityLabel={`${d.label}: income ${formatAmountMasked(d.incomeAmount, currency, hide)}, expenses ${formatAmountMasked(d.expenseAmount, currency, hide)}`}
              >
                <View style={styles.barsRow}>
                  <View
                    testID={`bar-income-${i}`}
                    style={[
                      styles.bar,
                      {
                        backgroundColor: colors.income,
                        opacity,
                        height: `${Math.max(MIN_BAR_HEIGHT, incomeRatio * 100)}%`,
                        borderTopLeftRadius: BAR_TOP_RADIUS,
                        borderTopRightRadius: BAR_TOP_RADIUS,
                      },
                    ]}
                  />
                  <View
                    testID={`bar-expense-${i}`}
                    style={[
                      styles.bar,
                      {
                        backgroundColor: colors.expense,
                        opacity,
                        height: `${Math.max(MIN_BAR_HEIGHT, expenseRatio * 100)}%`,
                        borderTopLeftRadius: BAR_TOP_RADIUS,
                        borderTopRightRadius: BAR_TOP_RADIUS,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {color: d.isToday ? colors.text : colors.textSecondary},
                  ]}
                >
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {!isEmpty ? (
        <View style={[styles.totals, {marginTop: spacing.md}]}>
          <Text style={[styles.totalLine, {color: colors.textSecondary}]}>
            Income this week: {formatAmountMasked(totals.income, currency, hide)}
          </Text>
          <Text style={[styles.totalLine, {color: colors.textSecondary}]}>
            Expenses this week: {formatAmountMasked(totals.expense, currency, hide)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: LEGEND_DOT,
    height: LEGEND_DOT,
    borderRadius: LEGEND_DOT / 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    flex: 1,
    width: '90%',
    justifyContent: 'center',
  },
  bar: {
    flex: 1,
    maxWidth: 14,
    minHeight: 2,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    marginTop: 4,
  },
  skeletonRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLine: {
    fontSize: 13,
  },
  totals: {
    gap: 2,
  },
  totalSkeletonWrap: {
    width: '55%',
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyChartText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptyCta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
