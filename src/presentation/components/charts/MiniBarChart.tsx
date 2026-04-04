import React, {useCallback, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BarChart} from 'react-native-gifted-charts';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
import {Card} from '../common/Card';
import {Skeleton} from '../feedback/Skeleton';

export type DaySpending = {
  label: string;
  amount: number;
  isToday?: boolean;
};

export type MiniBarChartProps = {
  data: DaySpending[];
  currency: string;
  isLoading?: boolean;
};

const CHART_HEIGHT = 140;
const BAR_WIDTH = 28;
const BAR_SPACING = 12;
const BAR_TOP_RADIUS = 6;
const SKELETON_BAR_COUNT = 7;

export function MiniBarChart({data, currency, isLoading}: MiniBarChartProps) {
  const {colors, spacing, radius, typography} = useTheme();

  const totalCents = useMemo(
    () => data.reduce((sum, d) => sum + d.amount, 0),
    [data],
  );

  const maxMajor = useMemo(() => {
    const max = Math.max(0, ...data.map(d => d.amount / 100));
    return max > 0 ? max : 1;
  }, [data]);

  const barData = useMemo(
    () =>
      data.map(d => ({
        value: d.amount / 100,
        label: d.label,
        frontColor: d.isToday ? colors.primary : colors.primaryLight,
        topLabelComponent: () => null,
      })),
    [colors.primary, colors.primaryLight, data],
  );

  const renderTooltip = useCallback(
    (_item: unknown, index: number) => {
      const cents = data[index]?.amount ?? 0;
      return (
        <View
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.sm,
            },
          ]}>
          <Text style={[styles.tooltipText, {color: colors.text}]}>
            {formatAmount(cents, currency)}
          </Text>
        </View>
      );
    },
    [colors.border, colors.surfaceElevated, colors.text, currency, data, radius.sm],
  );

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
              width={BAR_WIDTH}
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
      <Text style={[styles.sectionTitle, {color: colors.text}]}>This Week</Text>
      <View style={{marginTop: spacing.sm}}>
        {data.length === 0 ? (
          <View style={[styles.emptyChart, {height: CHART_HEIGHT}]}>
            <Text style={[styles.emptyChartText, {color: colors.textSecondary}]}>
              No spending data for this week
            </Text>
          </View>
        ) : (
          <BarChart
            adjustToWidth={false}
            autoCenterTooltip
            backgroundColor="transparent"
            barBorderTopLeftRadius={BAR_TOP_RADIUS}
            barBorderTopRightRadius={BAR_TOP_RADIUS}
            barWidth={BAR_WIDTH}
            data={barData}
            disableScroll={data.length <= SKELETON_BAR_COUNT}
            endSpacing={BAR_SPACING}
            height={CHART_HEIGHT}
            hideRules
            hideYAxisText
            initialSpacing={BAR_SPACING}
            maxValue={maxMajor}
            renderTooltip={renderTooltip}
            spacing={BAR_SPACING}
            xAxisColor={colors.border}
            xAxisLabelTextStyle={{
              color: colors.textSecondary,
              fontSize: typography.caption.fontSize,
              fontWeight: fontWeight.medium,
            }}
            xAxisThickness={1}
            yAxisThickness={0}
          />
        )}
      </View>
      <Text
        style={[
          styles.totalLabel,
          {
            color: colors.textSecondary,
            marginTop: spacing.md,
          },
        ]}>
        Total: {formatAmount(totalCents, currency)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  skeletonRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: BAR_SPACING,
  },
  tooltip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 13,
  },
  totalSkeletonWrap: {
    width: '55%',
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
