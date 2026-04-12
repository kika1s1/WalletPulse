import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {BarChart, PieChart} from 'react-native-gifted-charts';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {startOfDay, endOfDay} from '@shared/utils/date-helpers';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {SectionHeader} from '@presentation/components/layout/SectionHeader';
import {Spacer} from '@presentation/components/layout/Spacer';
import {Card} from '@presentation/components/common/Card';
import {Chip} from '@presentation/components/common/Chip';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import {useAnalytics} from '@presentation/hooks/useAnalytics';
import type {AnalyticsDateRange} from '@presentation/hooks/useAnalytics';
import {AppIcon} from '@presentation/components/common/AppIcon';
import type {AnalyticsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<AnalyticsStackParamList>;

type TabId = 'overview' | 'categories' | 'trends';

type RangePreset =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

function computeThisWeekRange(firstDay: 'monday' | 'sunday'): AnalyticsDateRange {
  const now = new Date();
  const dow = now.getDay();
  const offset =
    firstDay === 'sunday' ? dow : (dow + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - offset);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(now.getTime()),
  };
}

function computeThisMonthRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(now.getTime()),
  };
}

function computeLastMonthRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(end.getTime()),
  };
}

function computeLast3MonthsRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(now.getTime()),
  };
}

function computeThisYearRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return {
    startMs: startOfDay(start.getTime()),
    endMs: endOfDay(now.getTime()),
  };
}

function computeNonCustomRange(
  preset: Exclude<RangePreset, 'custom'>,
  firstDay: 'monday' | 'sunday',
): AnalyticsDateRange {
  switch (preset) {
    case 'this_week':
      return computeThisWeekRange(firstDay);
    case 'this_month':
      return computeThisMonthRange();
    case 'last_month':
      return computeLastMonthRange();
    case 'last_3_months':
      return computeLast3MonthsRange();
    case 'this_year':
      return computeThisYearRange();
    default:
      return computeThisMonthRange();
  }
}

const RANGE_PRESETS: {id: RangePreset; label: string}[] = [
  {id: 'this_week', label: 'This Week'},
  {id: 'this_month', label: 'This Month'},
  {id: 'last_month', label: 'Last Month'},
  {id: 'last_3_months', label: 'Last 3 Months'},
  {id: 'this_year', label: 'This Year'},
  {id: 'custom', label: 'Custom'},
];

export default function AnalyticsScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [rangePreset, setRangePreset] = useState<RangePreset>('this_month');
  const [customStartMs, setCustomStartMs] = useState(() => {
    const now = new Date();
    return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
  });
  const [customEndMs, setCustomEndMs] = useState(() => endOfDay(Date.now()));
  const [showCustomStartPicker, setShowCustomStartPicker] = useState(false);
  const [showCustomEndPicker, setShowCustomEndPicker] = useState(false);

  const dateRange = useMemo((): AnalyticsDateRange => {
    switch (rangePreset) {
      case 'this_week':
        return computeThisWeekRange(firstDayOfWeek);
      case 'this_month':
        return computeThisMonthRange();
      case 'last_month':
        return computeLastMonthRange();
      case 'last_3_months':
        return computeLast3MonthsRange();
      case 'this_year':
        return computeThisYearRange();
      case 'custom': {
        const lo = Math.min(customStartMs, customEndMs);
        const hi = Math.max(customStartMs, customEndMs);
        return {
          startMs: startOfDay(lo),
          endMs: endOfDay(hi),
        };
      }
      default:
        return computeThisMonthRange();
    }
  }, [
    rangePreset,
    firstDayOfWeek,
    customStartMs,
    customEndMs,
  ]);

  const {
    baseCurrency,
    totalIncome,
    totalExpenses,
    totalTransactions,
    netFlow,
    categoryBreakdown,
    dailyTrend,
    topMerchants,
    avgDailySpending,
    rangeSubtitle,
    isLoading,
    refetch,
  } = useAnalytics({dateRange});

  const hide = useSettingsStore((s) => s.hideAmounts);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  const tabs: {id: TabId; label: string}[] = [
    {id: 'overview', label: 'Overview'},
    {id: 'categories', label: 'Categories'},
    {id: 'trends', label: 'Trends'},
  ];

  const pieData = useMemo(
    () =>
      categoryBreakdown.slice(0, 6).map((cat) => ({
        value: cat.total / 100,
        color: cat.categoryColor,
        text: cat.categoryName,
      })),
    [categoryBreakdown],
  );

  const trendBars = useMemo(
    () =>
      dailyTrend.slice(-7).map((d) => ({
        value: d.expense / 100,
        label: d.label,
        frontColor: colors.expense,
      })),
    [dailyTrend, colors.expense],
  );

  const trendMax = useMemo(
    () => Math.max(1, ...trendBars.map((b) => b.value)),
    [trendBars],
  );

  const trendsChartTitle =
    dailyTrend.length <= 7 ? 'Spending by day' : 'Last 7 days';

  const onSelectPreset = useCallback(
    (id: RangePreset) => {
      setRangePreset((prev) => {
        if (id === 'custom' && prev !== 'custom') {
          const seed = computeNonCustomRange(prev, firstDayOfWeek);
          setCustomStartMs(seed.startMs);
          setCustomEndMs(seed.endMs);
        }
        return id;
      });
    },
    [firstDayOfWeek],
  );

  return (
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />

        <Text style={[styles.screenTitle, {color: colors.text}]}>
          Analytics
        </Text>
        <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
          {rangeSubtitle}
        </Text>

        <Spacer size={spacing.sm} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          fadingEdgeLength={40}
          contentContainerStyle={styles.chipScrollContent}>
          {RANGE_PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={rangePreset === p.id}
              onPress={() => onSelectPreset(p.id)}
              size="sm"
            />
          ))}
        </ScrollView>

        {rangePreset === 'custom' ? (
          <>
            <Spacer size={spacing.sm} />
            <View style={styles.customDateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Custom range start date"
                onPress={() => setShowCustomStartPicker(true)}
                style={[
                  styles.customDateCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}>
                <Text style={[styles.customDateLabel, {color: colors.textSecondary}]}>
                  Start
                </Text>
                <Text style={[styles.customDateValue, {color: colors.text}]}>
                  {new Date(customStartMs).toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Custom range end date"
                onPress={() => setShowCustomEndPicker(true)}
                style={[
                  styles.customDateCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}>
                <Text style={[styles.customDateLabel, {color: colors.textSecondary}]}>
                  End
                </Text>
                <Text style={[styles.customDateValue, {color: colors.text}]}>
                  {new Date(customEndMs).toLocaleDateString()}
                </Text>
              </Pressable>
            </View>
            {showCustomStartPicker ? (
              <DateTimePicker
                maximumDate={new Date()}
                mode="date"
                onChange={(_e, selected) => {
                  if (Platform.OS === 'android') {
                    setShowCustomStartPicker(false);
                  }
                  if (selected) {
                    setCustomStartMs(startOfDay(selected.getTime()));
                  }
                }}
                value={new Date(customStartMs)}
              />
            ) : null}
            {showCustomEndPicker ? (
              <DateTimePicker
                maximumDate={new Date()}
                mode="date"
                onChange={(_e, selected) => {
                  if (Platform.OS === 'android') {
                    setShowCustomEndPicker(false);
                  }
                  if (selected) {
                    setCustomEndMs(endOfDay(selected.getTime()));
                  }
                }}
                value={new Date(customEndMs)}
              />
            ) : null}
          </>
        ) : null}

        <Spacer size={spacing.base} />

        <View style={[styles.tabRow, {backgroundColor: colors.surface, borderRadius: radius.lg}]}>
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{selected: active}}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  active && {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                  },
                ]}>
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: active
                        ? fontWeight.semibold
                        : fontWeight.regular,
                    },
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Spacer size={spacing.lg} />
      </View>

      {isLoading ? (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Skeleton width="100%" height={120} borderRadius={radius.lg} />
          <Spacer size={spacing.base} />
          <Skeleton width="100%" height={200} borderRadius={radius.lg} />
          <Spacer size={spacing.base} />
          <Skeleton width="100%" height={160} borderRadius={radius.lg} />
        </View>
      ) : totalTransactions === 0 ? (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <EmptyState
            title="No data yet"
            message="Start adding transactions to see your analytics and spending insights."
          />
        </View>
      ) : (
        <>
          {activeTab === 'overview' && (
            <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                    Income
                  </Text>
                  <Text style={[styles.statValue, {color: colors.income}]}>
                    {formatAmountMasked(totalIncome, baseCurrency, hide)}
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                    Expenses
                  </Text>
                  <Text style={[styles.statValue, {color: colors.expense}]}>
                    {formatAmountMasked(totalExpenses, baseCurrency, hide)}
                  </Text>
                </Card>
              </View>

              <Spacer size={spacing.sm} />

              <View style={styles.statsGrid}>
                <Card style={styles.statCard} padding="sm">
                  <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                    Net Flow
                  </Text>
                  <Text
                    style={[
                      styles.statValue,
                      {color: netFlow >= 0 ? colors.success : colors.danger},
                    ]}>
                    {netFlow >= 0 ? '+' : ''}
                    {formatAmountMasked(netFlow, baseCurrency, hide)}
                  </Text>
                </Card>
                <Card style={styles.statCard} padding="sm">
                  <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
                    Avg Daily
                  </Text>
                  <Text style={[styles.statValue, {color: colors.text}]}>
                    {formatAmountMasked(avgDailySpending, baseCurrency, hide)}
                  </Text>
                </Card>
              </View>

              <Spacer size={spacing.lg} />

              <Card padding="md">
                <Text style={[styles.cardTitle, {color: colors.text}]}>
                  Top Merchants
                </Text>
                {topMerchants.length === 0 ? (
                  <Text style={[styles.emptyHint, {color: colors.textSecondary}]}>
                    No merchant data yet
                  </Text>
                ) : (
                  topMerchants.map((m, i) => (
                    <View
                      key={m.name}
                      style={[
                        styles.merchantRow,
                        i < topMerchants.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.borderLight,
                        },
                      ]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.merchantName, {color: colors.text}]}>
                        {m.name}
                      </Text>
                      <View style={styles.merchantRight}>
                        <Text style={[styles.merchantAmount, {color: colors.expense}]}>
                          {formatAmountMasked(m.total, baseCurrency, hide)}
                        </Text>
                        <Text style={[styles.merchantCount, {color: colors.textTertiary}]}>
                          {m.count} txn{m.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>

              <Spacer size={spacing.lg} />

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('CurrencyConverter')}
                style={[
                  styles.converterLink,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}>
                <AppIcon name="swap-horizontal-circle-outline" size={28} color={colors.primary} />
                <View style={styles.converterLinkText}>
                  <Text style={[styles.converterLinkTitle, {color: colors.text}]}>
                    Currency Converter
                  </Text>
                  <Text style={[styles.converterLinkSub, {color: colors.textSecondary}]}>
                    Convert between 150+ currencies
                  </Text>
                </View>
                <Text style={[styles.converterArrow, {color: colors.textTertiary}]}>
                  ›
                </Text>
              </Pressable>

              <Spacer size={spacing.sm} />

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('SpendingAutopsy')}
                style={[
                  styles.converterLink,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}>
                <AppIcon name="chart-timeline-variant-shimmer" size={28} color={colors.expense} />
                <View style={styles.converterLinkText}>
                  <Text style={[styles.converterLinkTitle, {color: colors.text}]}>
                    Spending Autopsy
                  </Text>
                  <Text style={[styles.converterLinkSub, {color: colors.textSecondary}]}>
                    Monthly spending analysis with insights
                  </Text>
                </View>
                <Text style={[styles.converterArrow, {color: colors.textTertiary}]}>
                  ›
                </Text>
              </Pressable>

              <Spacer size={spacing.sm} />

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('MoneyLostTracker')}
                style={[
                  styles.converterLink,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}>
                <AppIcon name="cash-remove" size={28} color={colors.danger} />
                <View style={styles.converterLinkText}>
                  <Text style={[styles.converterLinkTitle, {color: colors.text}]}>
                    Money Lost Tracker
                  </Text>
                  <Text style={[styles.converterLinkSub, {color: colors.textSecondary}]}>
                    See how much FX fees cost you
                  </Text>
                </View>
                <Text style={[styles.converterArrow, {color: colors.textTertiary}]}>
                  ›
                </Text>
              </Pressable>

              <Spacer size={spacing.sm} />

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('CurrencyTiming')}
                style={[
                  styles.converterLink,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}>
                <AppIcon name="clock-check-outline" size={28} color={colors.success} />
                <View style={styles.converterLinkText}>
                  <Text style={[styles.converterLinkTitle, {color: colors.text}]}>
                    Currency Timing
                  </Text>
                  <Text style={[styles.converterLinkSub, {color: colors.textSecondary}]}>
                    Best time to convert currencies
                  </Text>
                </View>
                <Text style={[styles.converterArrow, {color: colors.textTertiary}]}>
                  ›
                </Text>
              </Pressable>
            </View>
          )}

          {activeTab === 'categories' && (
            <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
              {categoryBreakdown.length === 0 ? (
                <EmptyState
                  title="No expense data"
                  message="Add expense transactions to see your spending breakdown by category."
                />
              ) : (
                <>
                  {pieData.length > 0 && (
                    <Card padding="md">
                      <Text style={[styles.cardTitle, {color: colors.text}]}>
                        Spending by Category
                      </Text>
                      <Spacer size={spacing.base} />
                      <View style={styles.pieCenter}>
                        <PieChart
                          data={pieData}
                          donut
                          radius={90}
                          innerRadius={58}
                          innerCircleColor={colors.card}
                          isAnimated={false}
                          showText={false}
                          focusOnPress={false}
                          centerLabelComponent={() => (
                            <View style={styles.pieCenterLabel}>
                              <Text
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                style={[
                                  styles.pieCenterAmount,
                                  {color: colors.text},
                                ]}>
                                {formatAmountMasked(totalExpenses, baseCurrency, hide)}
                              </Text>
                              <Text
                                style={[
                                  styles.pieCenterSub,
                                  {color: colors.textSecondary},
                                ]}>
                                Total
                              </Text>
                            </View>
                          )}
                        />
                      </View>
                    </Card>
                  )}

                  <Spacer size={spacing.lg} />

                  <SectionHeader title="Breakdown" />

                  <Card padding="md">
                    {categoryBreakdown.map((cat, idx) => (
                      <Pressable
                        key={cat.categoryId}
                        accessibilityRole="button"
                        accessibilityLabel={`${cat.categoryName}, ${cat.percentage.toFixed(0)}%`}
                        onPress={() => {
                          navigation.getParent()?.navigate('TransactionsTab', {
                            screen: 'TransactionsList',
                            params: {filterCategoryId: cat.categoryId},
                          });
                        }}
                        style={({pressed}) => [
                          styles.catRow,
                          pressed && {opacity: 0.7},
                          idx < categoryBreakdown.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.borderLight,
                            paddingBottom: 14,
                          },
                        ]}>
                        <View style={styles.catHeader}>
                          <View
                            style={[
                              styles.catIconWrap,
                              {backgroundColor: cat.categoryColor + '20'},
                            ]}>
                            <AppIcon name={cat.categoryIcon} size={18} color={cat.categoryColor} />
                          </View>
                          <View style={styles.catNameCol}>
                            <Text
                              numberOfLines={1}
                              style={[styles.catName, {color: colors.text}]}>
                              {cat.categoryName}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.catPercent, {color: colors.textSecondary}]}>
                              {cat.percentage.toFixed(1)}% ({cat.count} txn
                              {cat.count !== 1 ? 's' : ''})
                            </Text>
                          </View>
                          <Text style={[styles.catAmount, {color: colors.text}]}>
                            {formatAmountMasked(cat.total, baseCurrency, hide)}
                          </Text>
                        </View>
                        <ProgressBar
                          progress={cat.percentage / 100}
                          height={8}
                          color={cat.categoryColor}
                          showLabel={false}
                        />
                      </Pressable>
                    ))}
                  </Card>
                </>
              )}
            </View>
          )}

          {activeTab === 'trends' && (
            <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
              <Card padding="md">
                <Text style={[styles.cardTitle, {color: colors.text}]}>
                  {trendsChartTitle}
                </Text>
                <Spacer size={spacing.base} />
                <BarChart
                  data={trendBars}
                  height={160}
                  barWidth={28}
                  spacing={14}
                  barBorderTopLeftRadius={6}
                  barBorderTopRightRadius={6}
                  maxValue={trendMax}
                  hideYAxisText
                  hideRules
                  xAxisColor={colors.border}
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisLabelTextStyle={{
                    color: colors.textSecondary,
                    fontSize: 11,
                  }}
                />
              </Card>

              <Spacer size={spacing.lg} />

              <Card padding="md">
                <Text style={[styles.cardTitle, {color: colors.text}]}>
                  Summary Stats
                </Text>
                <Spacer size={spacing.sm} />
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.summaryStatLabel, {color: colors.textSecondary}]}>
                    Total transactions
                  </Text>
                  <Text style={[styles.summaryStatValue, {color: colors.text}]}>
                    {totalTransactions}
                  </Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.summaryStatLabel, {color: colors.textSecondary}]}>
                    Average daily spending
                  </Text>
                  <Text style={[styles.summaryStatValue, {color: colors.text}]}>
                    {formatAmountMasked(avgDailySpending, baseCurrency, hide)}
                  </Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.summaryStatLabel, {color: colors.textSecondary}]}>
                    Categories used
                  </Text>
                  <Text style={[styles.summaryStatValue, {color: colors.text}]}>
                    {categoryBreakdown.length}
                  </Text>
                </View>
                <View style={styles.summaryStatRow}>
                  <Text style={[styles.summaryStatLabel, {color: colors.textSecondary}]}>
                    Net cash flow
                  </Text>
                  <Text
                    style={[
                      styles.summaryStatValue,
                      {color: netFlow >= 0 ? colors.success : colors.danger},
                    ]}>
                    {netFlow >= 0 ? '+' : ''}
                    {formatAmountMasked(netFlow, baseCurrency, hide)}
                  </Text>
                </View>
              </Card>
            </View>
          )}
        </>
      )}

      <Spacer size={spacing.xl} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {
    alignSelf: 'stretch',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  chipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 24,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customDateCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customDateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  customDateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 8,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  merchantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    minWidth: 0,
    marginRight: 12,
  },
  merchantRight: {
    alignItems: 'flex-end',
  },
  merchantAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  merchantCount: {
    fontSize: 11,
    marginTop: 2,
  },
  converterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  converterLinkIcon: {
    fontSize: 28,
  },
  converterLinkText: {
    flex: 1,
    minWidth: 0,
  },
  converterLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  converterLinkSub: {
    fontSize: 13,
    marginTop: 2,
  },
  converterArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
  pieCenter: {
    alignItems: 'center',
    minHeight: 190,
    justifyContent: 'center',
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pieCenterAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  pieCenterSub: {
    fontSize: 12,
    marginTop: 2,
  },
  catRow: {
    paddingTop: 12,
    gap: 8,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameCol: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  catAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  catPercent: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryStatLabel: {
    fontSize: 14,
  },
  summaryStatValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
