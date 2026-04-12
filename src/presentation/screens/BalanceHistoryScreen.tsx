import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
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

type AnalyticsRoute = RouteProp<AnalyticsStackParamList, 'BalanceHistory'>;
type WalletsRoute = RouteProp<WalletsStackParamList, 'WalletBalanceHistory'>;

const PERIODS: {id: BalancePeriod; label: string}[] = [
  {id: '1W', label: '1W'},
  {id: '1M', label: '1M'},
  {id: '3M', label: '3M'},
  {id: '6M', label: '6M'},
  {id: '1Y', label: '1Y'},
  {id: 'ALL', label: 'All'},
];

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
    walletId,
    setWalletId,
    walletOptions,
  } = useBalanceHistory({walletId: initialWalletId});

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const focusedPoint = focusedIdx !== null && points[focusedIdx] ? points[focusedIdx] : null;

  const lineColor = changeAmount >= 0 ? colors.success : colors.danger;
  const gradientColor = changeAmount >= 0 ? colors.success : colors.danger;

  const chartData = useMemo(() => {
    if (points.length === 0) {return [];}

    const maxPoints = 60;
    const step = points.length > maxPoints ? Math.ceil(points.length / maxPoints) : 1;
    const sampled = step > 1
      ? points.filter((_, i) => i % step === 0 || i === points.length - 1)
      : points;

    return sampled.map((p) => ({
      value: p.balance / 100,
      label: '',
      dataPointText: '',
    }));
  }, [points]);

  const chartMin = useMemo(() => {
    if (chartData.length === 0) {return 0;}
    return Math.min(...chartData.map((d) => d.value));
  }, [chartData]);

  const chartMax = useMemo(() => {
    if (chartData.length === 0) {return 100;}
    return Math.max(...chartData.map((d) => d.value));
  }, [chartData]);

  const yAxisRange = chartMax - chartMin;
  const yAxisOffset = chartMin - yAxisRange * 0.1;

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

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer>
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
              onPress={() => {
                setWalletId(null);
                setFocusedIdx(null);
              }}
              style={[
                styles.walletChip,
                {
                  backgroundColor: walletId === null ? colors.primary : colors.surface,
                  borderColor: walletId === null ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                },
              ]}>
              <AppIcon
                name="wallet-outline"
                size={16}
                color={walletId === null ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.walletChipText,
                  {color: walletId === null ? '#FFFFFF' : colors.text},
                ]}>
                All Wallets
              </Text>
              <Text
                style={[
                  styles.walletChipCurrency,
                  {color: walletId === null ? 'rgba(255,255,255,0.7)' : colors.textTertiary},
                ]}>
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
                  onPress={() => {
                    setWalletId(w.id);
                    setFocusedIdx(null);
                  }}
                  style={[
                    styles.walletChip,
                    {
                      backgroundColor: active ? w.color : colors.surface,
                      borderColor: active ? w.color : colors.border,
                      borderRadius: radius.lg,
                    },
                  ]}>
                  <AppIcon
                    name={resolveIconName(w.icon)}
                    size={16}
                    color={active ? '#FFFFFF' : w.color}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.walletChipText,
                      {color: active ? '#FFFFFF' : colors.text},
                    ]}>
                    {w.name}
                  </Text>
                  <Text
                    style={[
                      styles.walletChipCurrency,
                      {color: active ? 'rgba(255,255,255,0.7)' : colors.textTertiary},
                    ]}>
                    {w.currency}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Spacer size={spacing.base} />

          {isLoading ? (
            <>
              <Skeleton width="60%" height={20} borderRadius={radius.sm} />
              <Spacer size={8} />
              <Skeleton width="80%" height={36} borderRadius={radius.sm} />
              <Spacer size={spacing.lg} />
              <Skeleton width="100%" height={220} borderRadius={radius.lg} />
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
              <Text style={[styles.walletLabel, {color: colors.textTertiary}]}>
                {headerSubtitle}
              </Text>
              <Text style={[styles.dateLabel, {color: colors.textSecondary}]}>
                {displayDate}
              </Text>
              <Text
                style={[
                  styles.balanceAmount,
                  {color: colors.text},
                ]}>
                {formatAmountMasked(displayBalance, displayCurrency, hide)}
              </Text>

              {!focusedPoint && (
                <View style={styles.changeRow}>
                  <View
                    style={[
                      styles.changePill,
                      {
                        backgroundColor: changeAmount >= 0 ? colors.successLight : colors.dangerLight,
                        borderRadius: radius.full,
                      },
                    ]}>
                    <AppIcon
                      name={changeAmount >= 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={changeAmount >= 0 ? colors.success : colors.danger}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        {color: changeAmount >= 0 ? colors.success : colors.danger},
                      ]}>
                      {changeAmount >= 0 ? '+' : ''}
                      {formatAmountMasked(changeAmount, displayCurrency, hide)}
                      {' '}
                      ({changePercent >= 0 ? '+' : ''}{changePercent}%)
                    </Text>
                  </View>
                  <Text style={[styles.periodLabel, {color: colors.textTertiary}]}>
                    this period
                  </Text>
                </View>
              )}

              <Spacer size={spacing.lg} />

              <View style={styles.periodRow}>
                {PERIODS.map((p) => {
                  const active = p.id === period;
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="tab"
                      accessibilityState={{selected: active}}
                      onPress={() => {
                        setPeriod(p.id);
                        setFocusedIdx(null);
                      }}
                      style={[
                        styles.periodChip,
                        {
                          backgroundColor: active ? colors.primary : 'transparent',
                          borderRadius: radius.md,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.periodChipText,
                          {color: active ? '#FFFFFF' : colors.textSecondary},
                        ]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Spacer size={spacing.base} />

              <View style={[styles.chartCard, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.lg}]}>
                {chartData.length > 1 ? (
                  <LineChart
                    data={chartData}
                    height={200}
                    width={280}
                    adjustToWidth
                    curved
                    areaChart
                    hideDataPoints
                    thickness={2.5}
                    color={lineColor}
                    startFillColor={gradientColor}
                    endFillColor={isDark ? colors.background : colors.surface}
                    startOpacity={0.25}
                    endOpacity={0.02}
                    hideYAxisText
                    hideRules
                    yAxisOffset={yAxisOffset}
                    xAxisThickness={0}
                    yAxisThickness={0}
                    isAnimated
                    animationDuration={600}
                    pointerConfig={{
                      pointerStripUptoDataPoint: true,
                      pointerStripColor: colors.border,
                      pointerStripWidth: 1,
                      pointerColor: lineColor,
                      radius: 5,
                      pointerLabelWidth: 0,
                      activatePointersOnLongPress: false,
                      autoAdjustPointerLabelPosition: false,
                      pointerLabelComponent: () => null,
                    }}
                  />
                ) : (
                  <View style={styles.singlePointMsg}>
                    <Text style={[styles.singlePointText, {color: colors.textSecondary}]}>
                      Only one data point available
                    </Text>
                  </View>
                )}
              </View>

              <Spacer size={spacing.lg} />

              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="arrow-up-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                      Highest
                    </Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.success}]}>
                    {formatAmountMasked(highWater, displayCurrency, hide)}
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="arrow-down-circle-outline" size={16} color={colors.danger} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                      Lowest
                    </Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.danger}]}>
                    {formatAmountMasked(lowWater, displayCurrency, hide)}
                  </Text>
                </Card>
              </View>

              <Spacer size={spacing.sm} />

              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="chart-line" size={16} color={colors.primary} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                      Change
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.statValue,
                      {color: changeAmount >= 0 ? colors.success : colors.danger},
                    ]}>
                    {changeAmount >= 0 ? '+' : ''}
                    {formatAmountMasked(changeAmount, displayCurrency, hide)}
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <View style={styles.statRow}>
                    <AppIcon name="calendar-range" size={16} color={colors.primary} />
                    <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                      Data Points
                    </Text>
                  </View>
                  <Text style={[styles.statValue, {color: colors.text}]}>
                    {points.length} days
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
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  walletPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 24,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  walletChipText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    maxWidth: 100,
  },
  walletChipCurrency: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  walletLabel: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  periodLabel: {
    fontSize: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 4,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  chartCard: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  singlePointMsg: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlePointText: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  statValue: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
});
