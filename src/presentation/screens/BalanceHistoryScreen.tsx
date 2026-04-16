import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {Spacer} from '@presentation/components/layout/Spacer';
import {Card} from '@presentation/components/common/Card';
import {BackButton} from '@presentation/components/common';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  useBalanceHistory,
  type BalancePeriod,
} from '@presentation/hooks/useBalanceHistory';
import type {AnalyticsStackParamList, WalletsStackParamList} from '@presentation/navigation/types';
import type {BalanceHistoryPoint} from '@domain/usecases/calculate-balance-history';

type AnalyticsRoute = RouteProp<AnalyticsStackParamList, 'BalanceHistory'>;
type WalletsRoute = RouteProp<WalletsStackParamList, 'WalletBalanceHistory'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_H = 240;
const CHART_PADDING = 16;
const CHART_W = SCREEN_WIDTH - CHART_PADDING * 2 - 32;

const PERIODS: {id: BalancePeriod; label: string}[] = [
  {id: '1W', label: '1W'},
  {id: '1M', label: '1M'},
  {id: '3M', label: '3M'},
  {id: '6M', label: '6M'},
  {id: '1Y', label: '1Y'},
  {id: '2Y', label: '2Y'},
  {id: '5Y', label: '5Y'},
  {id: 'ALL', label: 'All'},
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function smartLabel(ms: number, period: BalancePeriod): string {
  const d = new Date(ms);
  if (period === '1W') {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  }
  if (period === '1M') {
    return `${d.getDate()}`;
  }
  if (period === '3M' || period === '6M') {
    return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  }
  return `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

function formatYAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {return `${(value / 1_000_000).toFixed(1)}M`;}
  if (abs >= 1_000) {return `${(value / 1_000).toFixed(0)}K`;}
  return value.toFixed(0);
}

type SampledPoint = {
  value: number;
  label: string;
  labelTextStyle?: {color: string; fontSize: number};
  showXAxisIndex?: boolean;
  originalIdx: number;
};

function smartSample(
  points: BalanceHistoryPoint[],
  period: BalancePeriod,
  labelColor: string,
): SampledPoint[] {
  if (points.length === 0) {return [];}

  const maxPoints = 90;
  const step = points.length > maxPoints ? Math.ceil(points.length / maxPoints) : 1;

  const sampled: SampledPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (step > 1 && i % step !== 0 && i !== points.length - 1) {continue;}
    sampled.push({
      value: points[i].balance / 100,
      label: '',
      originalIdx: i,
    });
  }

  const labelCount = period === '1W' ? 7 : period === '1M' ? 5 : 5;
  const labelStep = Math.max(1, Math.floor(sampled.length / labelCount));
  const labelStyle = {color: labelColor, fontSize: 10};

  for (let i = 0; i < sampled.length; i++) {
    if (i % labelStep === 0 || i === sampled.length - 1) {
      const pt = points[sampled[i].originalIdx];
      sampled[i].label = smartLabel(pt.dateMs, period);
      sampled[i].labelTextStyle = labelStyle;
    }
  }

  return sampled;
}

export default function BalanceHistoryScreen() {
  const {colors, spacing, radius, isDark} = useTheme();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const route = useRoute<AnalyticsRoute | WalletsRoute>();
  const initialWalletId = (route.params as {walletId?: string} | undefined)?.walletId ?? null;

  const {
    points,
    period,
    setPeriod,
    displayCurrency,
    currentBalance,
    highWater,
    lowWater,
    changeAmount,
    changePercent,
    isLoading,
    refetch,
    walletId,
    setWalletId,
    walletOptions,
  } = useBalanceHistory({walletId: initialWalletId});

  const [refreshing, setRefreshing] = useState(false);
  const wasRefreshingRef = useRef(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  if (refreshing && isLoading) {
    wasRefreshingRef.current = true;
  }
  if (refreshing && !isLoading && wasRefreshingRef.current) {
    setRefreshing(false);
    wasRefreshingRef.current = false;
  }

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const focusedPoint = focusedIdx !== null && points[focusedIdx] ? points[focusedIdx] : null;

  const isPositive = changeAmount >= 0;
  const lineColor = isPositive ? colors.success : colors.danger;

  const chartData = useMemo(
    () => smartSample(points, period, colors.textTertiary),
    [points, period, colors.textTertiary],
  );

  const {yMin, yMax, yAxisOffset, maxValue, stepValue, noOfSections} = useMemo(() => {
    if (chartData.length === 0) {
      return {yMin: 0, yMax: 100, yAxisOffset: 0, maxValue: 100, stepValue: 25, noOfSections: 4};
    }
    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || Math.abs(max) * 0.1 || 100;
    const padding = range * 0.08;
    const lo = min - padding;
    const hi = max + padding;
    const sections = 4;
    const sv = Math.ceil((hi - lo) / sections);
    return {
      yMin: lo,
      yMax: hi,
      yAxisOffset: lo,
      maxValue: lo + sv * sections,
      stepValue: sv,
      noOfSections: sections,
    };
  }, [chartData]);

  const handlePointerMove = useCallback(
    (items: {index: number}[]) => {
      const idx = items?.[0]?.index;
      if (idx != null && chartData[idx]) {
        setFocusedIdx(chartData[idx].originalIdx);
      }
    },
    [chartData],
  );

  const displayBalance = focusedPoint ? focusedPoint.balance : currentBalance;
  const displayDate = focusedPoint
    ? new Date(focusedPoint.dateMs).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Current Balance';

  const selectedWalletOption = walletId
    ? walletOptions.find((w) => w.id === walletId)
    : null;

  const headerSubtitle = selectedWalletOption
    ? `${selectedWalletOption.name} (${selectedWalletOption.currency})`
    : `All Wallets (${displayCurrency})`;

  const periodRangeLabel = useMemo(() => {
    if (points.length < 2) {return '';}
    const first = new Date(points[0].dateMs);
    const last = new Date(points[points.length - 1].dateMs);
    const fmt = (d: Date) =>
      `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    return `${fmt(first)} \u2014 ${fmt(last)}`;
  }, [points]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <View style={styles.header}>
            <BackButton />
            <Text style={[styles.headerTitle, {color: colors.text}]}>
              Balance History
            </Text>
            <View style={{width: 32}} />
          </View>

          <Spacer size={spacing.sm} />

          {/* Wallet Picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            fadingEdgeLength={40}
            contentContainerStyle={styles.walletPickerContent}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{selected: walletId === null}}
              onPress={() => { setWalletId(null); setFocusedIdx(null); }}
              style={[
                styles.walletChip,
                {
                  backgroundColor: walletId === null ? colors.primary : colors.surface,
                  borderColor: walletId === null ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                },
              ]}>
              <AppIcon name="wallet-outline" size={16} color={walletId === null ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.walletChipText, {color: walletId === null ? '#FFFFFF' : colors.text}]}>
                All Wallets
              </Text>
              <Text style={[styles.walletChipCurrency, {color: walletId === null ? 'rgba(255,255,255,0.7)' : colors.textTertiary}]}>
                {displayCurrency}
              </Text>
            </Pressable>
            {walletOptions.map((w) => {
              const active = walletId === w.id;
              return (
                <Pressable
                  key={w.id}
                  accessibilityRole="tab"
                  accessibilityState={{selected: active}}
                  onPress={() => { setWalletId(w.id); setFocusedIdx(null); }}
                  style={[
                    styles.walletChip,
                    {
                      backgroundColor: active ? w.color : colors.surface,
                      borderColor: active ? w.color : colors.border,
                      borderRadius: radius.lg,
                    },
                  ]}>
                  <AppIcon name={resolveIconName(w.icon)} size={16} color={active ? '#FFFFFF' : w.color} />
                  <Text numberOfLines={1} style={[styles.walletChipText, {color: active ? '#FFFFFF' : colors.text}]}>
                    {w.name}
                  </Text>
                  <Text style={[styles.walletChipCurrency, {color: active ? 'rgba(255,255,255,0.7)' : colors.textTertiary}]}>
                    {w.currency}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Spacer size={spacing.base} />

          {isLoading ? (
            <>
              <Skeleton width="40%" height={14} borderRadius={radius.sm} />
              <Spacer size={6} />
              <Skeleton width="65%" height={38} borderRadius={radius.sm} />
              <Spacer size={spacing.lg} />
              <Skeleton width="100%" height={CHART_H + 40} borderRadius={radius.lg} />
              <Spacer size={spacing.lg} />
              <View style={styles.statsGrid}>
                <Skeleton width="48%" height={70} borderRadius={radius.md} />
                <Skeleton width="48%" height={70} borderRadius={radius.md} />
              </View>
            </>
          ) : points.length === 0 ? (
            <EmptyState
              title="No history yet"
              message={
                selectedWalletOption
                  ? `No transactions found for ${selectedWalletOption.name}.`
                  : 'Your balance history will appear here once you start adding transactions.'
              }
            />
          ) : (
            <>
              {/* Balance header */}
              <Text style={[styles.walletLabel, {color: colors.textTertiary}]}>
                {headerSubtitle}
              </Text>
              <Text style={[styles.dateLabel, {color: colors.textSecondary}]}>
                {displayDate}
              </Text>
              <Text style={[styles.balanceAmount, {color: colors.text}]}>
                {formatAmountMasked(displayBalance, displayCurrency, hide)}
              </Text>

              {!focusedPoint && (
                <View style={styles.changeRow}>
                  <View
                    style={[
                      styles.changePill,
                      {
                        backgroundColor: isPositive ? colors.successLight : colors.dangerLight,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <AppIcon
                      name={isPositive ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={isPositive ? colors.success : colors.danger}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        {color: isPositive ? colors.success : colors.danger},
                      ]}>
                      {isPositive ? '+' : ''}
                      {formatAmountMasked(changeAmount, displayCurrency, hide)}
                      {' '}({changePercent >= 0 ? '+' : ''}{changePercent}%)
                    </Text>
                  </View>
                  <Text style={[styles.periodLabel, {color: colors.textTertiary}]}>
                    this period
                  </Text>
                </View>
              )}

              <Spacer size={spacing.lg} />

              {/* Period selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.periodScrollContent}>
                {PERIODS.map((p) => {
                  const active = p.id === period;
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="tab"
                      accessibilityState={{selected: active}}
                      onPress={() => { setPeriod(p.id); setFocusedIdx(null); }}
                      style={[
                        styles.periodChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: radius.md,
                        },
                      ]}>
                      <Text style={[styles.periodChipText, {color: active ? '#FFFFFF' : colors.textSecondary}]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {periodRangeLabel.length > 0 && (
                <Text style={[styles.rangeLabel, {color: colors.textTertiary}]}>
                  {periodRangeLabel}
                </Text>
              )}

              <Spacer size={spacing.base} />

              {/* Chart */}
              <View
                style={[
                  styles.chartContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.lg,
                  },
                ]}>
                {chartData.length > 1 ? (
                  <LineChart
                    data={chartData}
                    height={CHART_H}
                    width={CHART_W}
                    adjustToWidth
                    curved
                    curvature={0.15}
                    areaChart
                    hideDataPoints
                    thickness={2.5}
                    color={lineColor}
                    startFillColor={lineColor}
                    endFillColor={isDark ? colors.background : colors.surface}
                    startOpacity={0.2}
                    endOpacity={0.01}
                    yAxisOffset={yAxisOffset}
                    maxValue={maxValue}
                    stepValue={stepValue}
                    noOfSections={noOfSections}
                    yAxisTextStyle={{color: colors.textTertiary, fontSize: 10}}
                    yAxisLabelWidth={48}
                    formatYLabel={(v: string) => formatYAxis(parseFloat(v))}
                    rulesType="dashed"
                    dashWidth={4}
                    dashGap={4}
                    rulesColor={isDark ? colors.borderLight : colors.border}
                    xAxisColor={colors.border}
                    xAxisThickness={StyleSheet.hairlineWidth}
                    yAxisThickness={0}
                    isAnimated
                    animationDuration={500}
                    showReferenceLine1={yMin < 0 && yMax > 0}
                    referenceLine1Position={0}
                    referenceLine1Config={{
                      color: colors.textTertiary,
                      dashWidth: 6,
                      dashGap: 4,
                      thickness: 1,
                    }}
                    pointerConfig={{
                      pointerStripUptoDataPoint: true,
                      pointerStripColor: colors.border,
                      pointerStripWidth: 1,
                      strokeDashArray: [4, 4],
                      pointerColor: lineColor,
                      radius: 6,
                      pointerLabelWidth: 0,
                      activatePointersOnLongPress: false,
                      autoAdjustPointerLabelPosition: false,
                      pointerVanishDelay: 3000,
                      pointerLabelComponent: () => null,
                      onPointerMoved: handlePointerMove,
                    }}
                  />
                ) : (
                  <View style={styles.singlePointMsg}>
                    <AppIcon name="chart-line" size={32} color={colors.textTertiary} />
                    <Text style={[styles.singlePointText, {color: colors.textSecondary}]}>
                      Only one data point available. Add more transactions to see your trend.
                    </Text>
                  </View>
                )}
              </View>

              <Spacer size={spacing.lg} />

              {/* Stats row 1 */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="arrow-up-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Highest</Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.success}]}>
                    {formatAmountMasked(highWater, displayCurrency, hide)}
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="arrow-down-circle-outline" size={16} color={colors.danger} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Lowest</Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.danger}]}>
                    {formatAmountMasked(lowWater, displayCurrency, hide)}
                  </Text>
                </Card>
              </View>

              <Spacer size={spacing.sm} />

              {/* Stats row 2 */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="swap-vertical" size={16} color={isPositive ? colors.success : colors.danger} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Net Change</Text>
                  </View>
                  <Text style={[styles.statValue, {color: isPositive ? colors.success : colors.danger}]}>
                    {isPositive ? '+' : ''}{formatAmountMasked(changeAmount, displayCurrency, hide)}
                  </Text>
                  <Text style={[styles.statSub, {color: colors.textTertiary}]}>
                    {changePercent >= 0 ? '+' : ''}{changePercent}%
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="calendar-range" size={16} color={colors.primary} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Span</Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.text}]}>
                    {points.length} days
                  </Text>
                  <Text style={[styles.statSub, {color: colors.textTertiary}]}>
                    {chartData.length} chart points
                  </Text>
                </Card>
              </View>
            </>
          )}

          <Spacer size={spacing.xl} />
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  padded: {alignSelf: 'stretch'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  walletPickerContent: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingRight: 24},
  walletChip: {flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8},
  walletChipText: {fontSize: 13, fontWeight: fontWeight.semibold, maxWidth: 100},
  walletChipCurrency: {fontSize: 11, fontWeight: fontWeight.medium},
  walletLabel: {fontSize: 12, fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: 0.5},
  dateLabel: {fontSize: 13, fontWeight: fontWeight.medium, marginTop: 2},
  balanceAmount: {fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginTop: 4},
  changeRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
  changePill: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4},
  changeText: {fontSize: 13, fontWeight: fontWeight.semibold},
  periodLabel: {fontSize: 12},
  periodScrollContent: {flexDirection: 'row', gap: 6, paddingRight: 16},
  periodChip: {borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center'},
  periodChipText: {fontSize: 13, fontWeight: fontWeight.semibold},
  rangeLabel: {fontSize: 11, marginTop: 6, textAlign: 'center'},
  chartContainer: {borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', paddingTop: 16, paddingBottom: 8, paddingRight: 8},
  singlePointMsg: {height: CHART_H, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32},
  singlePointText: {fontSize: 14, textAlign: 'center'},
  statsGrid: {flexDirection: 'row', gap: 12},
  statCard: {flex: 1},
  statRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6},
  statLabel: {fontSize: 12, fontWeight: fontWeight.medium},
  statValue: {fontSize: 17, fontWeight: fontWeight.bold},
  statSub: {fontSize: 11, marginTop: 2},
});
