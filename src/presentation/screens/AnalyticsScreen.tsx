import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BarChart, PieChart} from 'react-native-gifted-charts';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {SectionHeader} from '@presentation/components/layout/SectionHeader';
import {Spacer} from '@presentation/components/layout/Spacer';
import {Card} from '@presentation/components/common/Card';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import {useAnalytics} from '@presentation/hooks/useAnalytics';
import {AppIcon} from '@presentation/components/common/AppIcon';
import type {AnalyticsStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<AnalyticsStackParamList>;

type TabId = 'overview' | 'categories' | 'trends';

export default function AnalyticsScreen() {
  const {colors, spacing, radius, typography} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

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
    isLoading,
    refetch,
  } = useAnalytics();

  const hide = useSettingsStore((s) => s.hideAmounts);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 600);
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

  return (
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />

        <Text style={[styles.screenTitle, {color: colors.text}]}>
          Analytics
        </Text>
        <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
          This month
        </Text>

        <Spacer size={spacing.base} />

        <View style={styles.tabRow}>
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
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.surfaceElevated,
                    borderRadius: radius.full,
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
            </View>
          )}

          {activeTab === 'categories' && (
            <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
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
                      radius={80}
                      innerRadius={50}
                      innerCircleColor={colors.card}
                      centerLabelComponent={() => (
                        <View style={styles.pieCenterLabel}>
                          <Text
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

              {categoryBreakdown.map((cat) => (
                <View key={cat.categoryId} style={styles.catRow}>
                  <View style={styles.catHeader}>
                    <View
                      style={[
                        styles.catDot,
                        {backgroundColor: cat.categoryColor},
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.catName, {color: colors.text}]}>
                      {cat.categoryName}
                    </Text>
                    <Text style={[styles.catAmount, {color: colors.text}]}>
                      {formatAmountMasked(cat.total, baseCurrency, hide)}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={cat.percentage / 100}
                    height={6}
                    color={cat.categoryColor}
                    showLabel={false}
                  />
                  <Text
                    style={[styles.catPercent, {color: colors.textSecondary}]}>
                    {cat.percentage.toFixed(1)}% of spending ({cat.count} txn
                    {cat.count !== 1 ? 's' : ''})
                  </Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'trends' && (
            <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
              <Card padding="md">
                <Text style={[styles.cardTitle, {color: colors.text}]}>
                  Last 7 Days
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  pieCenterSub: {
    fontSize: 11,
    marginTop: 2,
  },
  catRow: {
    marginTop: 12,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 0,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  catPercent: {
    fontSize: 12,
    marginTop: 4,
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
