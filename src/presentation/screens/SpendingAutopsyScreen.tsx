import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {BackButton} from '@presentation/components/common/BackButton';
import {Card} from '@presentation/components/common/Card';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {Spacer} from '@presentation/components/layout/Spacer';
import {
  GenerateSpendingAutopsy,
  type AutopsyInsight,
} from '@domain/usecases/generate-spending-autopsy';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useCategories} from '@presentation/hooks/useCategories';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {makeGetConversionRate} from '@infrastructure/fx-service';

const INSIGHT_ICON: Record<AutopsyInsight['type'], string> = {
  overspend: 'trending-up',
  savings_opportunity: 'lightbulb-on-outline',
  trend: 'chart-line',
  subscription_waste: 'sync-alert',
  positive: 'check-circle-outline',
};

const SEVERITY_COLOR_KEY: Record<AutopsyInsight['severity'], 'danger' | 'warning' | 'primary'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'primary',
};

type RateMap = Record<string, number>;

function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: RateMap,
): number {
  if (currency.toUpperCase() === baseCurrency.toUpperCase()) {return amount;}
  const rate = rates[currency.toUpperCase()];
  return rate ? Math.round(amount * rate) : amount;
}

function computeMonthRanges() {
  const now = new Date();
  const dayOfMonth = now.getDate();

  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const currentEnd = now.getTime();

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = prevMonthStart.getTime();
  const prevEnd = new Date(
    prevMonthStart.getFullYear(),
    prevMonthStart.getMonth(),
    Math.min(dayOfMonth, new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0).getDate()),
    now.getHours(), now.getMinutes(), now.getSeconds(),
  ).getTime();

  return {currentStart, currentEnd, prevStart, prevEnd};
}

export default function SpendingAutopsyScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const hide = useSettingsStore((s) => s.hideAmounts);
  const {transactions, isLoading: txLoading, refetch} = useTransactions({syncWithFilterStore: false});
  const {categories} = useCategories();

  const [fxRates, setFxRates] = useState<RateMap>({});
  const fetchedRef = useRef('');

  const allCurrencies = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {set.add(t.currency.toUpperCase());}
    return Array.from(set);
  }, [transactions]);

  useEffect(() => {
    const key = allCurrencies.sort().join(',') + ':' + baseCurrency;
    if (key === fetchedRef.current) {return;}
    fetchedRef.current = key;
    const nonBase = allCurrencies.filter((c) => c !== baseCurrency.toUpperCase());
    if (nonBase.length === 0) {setFxRates({}); return;}
    let cancelled = false;
    (async () => {
      const ds = getLocalDataSource();
      const getRate = makeGetConversionRate({fxRateRepo: ds.fxRates});
      const result: RateMap = {};
      for (const c of nonBase) {
        try {
          const r = await getRate(c, baseCurrency);
          if (r !== null) {result[c] = r;}
        } catch { /* skip */ }
      }
      if (!cancelled) {setFxRates(result);}
    })();
    return () => { cancelled = true; };
  }, [allCurrencies, baseCurrency]);

  const {currentStart, currentEnd, prevStart, prevEnd} =
    useMemo(() => computeMonthRanges(), []);

  const result = useMemo(() => {
    const currentTxns = transactions
      .filter((t) => t.transactionDate >= currentStart && t.transactionDate <= currentEnd)
      .map((t) => ({
        amount: convertToBase(t.amount, t.currency, baseCurrency, fxRates),
        categoryId: t.categoryId,
        transactionDate: t.transactionDate,
        type: t.type as 'income' | 'expense' | 'transfer',
      }));

    const previousTxns = transactions
      .filter((t) => t.transactionDate >= prevStart && t.transactionDate <= prevEnd)
      .map((t) => ({
        amount: convertToBase(t.amount, t.currency, baseCurrency, fxRates),
        categoryId: t.categoryId,
        transactionDate: t.transactionDate,
        type: t.type as 'income' | 'expense' | 'transfer',
      }));

    const catList = categories.map((c) => ({id: c.id, name: c.name}));

    return new GenerateSpendingAutopsy().execute({
      currentPeriodTransactions: currentTxns,
      previousPeriodTransactions: previousTxns,
      categories: catList,
    });
  }, [transactions, categories, currentStart, currentEnd, prevStart, prevEnd, baseCurrency, fxRates]);

  const monthLabel = new Date().toLocaleString('default', {month: 'long', year: 'numeric'});
  const changeSign = result.periodComparison.changePercent >= 0 ? '+' : '';
  const changeColor =
    result.periodComparison.changePercent > 0
      ? colors.danger
      : result.periodComparison.changePercent < 0
        ? colors.success
        : colors.textSecondary;

  const isLoading = txLoading;

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

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[styles.header, {paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.base}]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[typo.headline, {color: colors.text, flex: 1, textAlign: 'center'}]}>
          Spending Autopsy
        </Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={[styles.scroll, {padding: spacing.base, paddingBottom: insets.bottom + spacing.xl}]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}>

        {isLoading ? (
          <>
            <Skeleton width="100%" height={120} borderRadius={radius.lg} />
            <Spacer size={spacing.md} />
            <Skeleton width="100%" height={80} borderRadius={radius.lg} />
            <Spacer size={spacing.sm} />
            <Skeleton width="100%" height={80} borderRadius={radius.lg} />
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(300)}>
              <Card style={styles.summaryCard}>
                <Text style={[typo.caption, {color: colors.textSecondary}]}>
                  {monthLabel} (to date)
                </Text>
                <Text style={[styles.totalSpent, {color: colors.text}]}>
                  {formatAmountMasked(result.totalSpent, baseCurrency, hide)}
                </Text>
                <Text style={[typo.footnote, {color: changeColor}]}>
                  {changeSign}{result.periodComparison.changePercent}% vs same period last month
                </Text>
                {result.topCategory !== 'None' && (
                  <Text style={[typo.caption, {color: colors.textTertiary, marginTop: spacing.xs}]}>
                    Top category: {result.topCategory}
                  </Text>
                )}
                {result.biggestChange !== 'None' && result.biggestChange !== result.topCategory && (
                  <Text style={[typo.caption, {color: colors.textTertiary, marginTop: 2}]}>
                    Biggest change: {result.biggestChange}
                  </Text>
                )}
              </Card>
            </Animated.View>

            <Spacer size={spacing.sm} />

            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <Card padding="sm">
                <View style={styles.compRow}>
                  <View style={styles.compCol}>
                    <Text style={[typo.caption, {color: colors.textSecondary}]}>This month</Text>
                    <Text style={[styles.compValue, {color: colors.text}]}>
                      {formatAmountMasked(result.periodComparison.current, baseCurrency, hide)}
                    </Text>
                  </View>
                  <Icon name="arrow-right" size={16} color={colors.textTertiary} />
                  <View style={styles.compCol}>
                    <Text style={[typo.caption, {color: colors.textSecondary}]}>Last month</Text>
                    <Text style={[styles.compValue, {color: colors.textSecondary}]}>
                      {formatAmountMasked(result.periodComparison.previous, baseCurrency, hide)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {result.insights.length === 0 && (
              <Card style={{...styles.emptyCard, marginTop: spacing.md}}>
                <Icon name="check-circle-outline" size={36} color={colors.success} />
                <Text style={[typo.body, {color: colors.textSecondary, textAlign: 'center'}]}>
                  No significant spending changes this month. Keep it up!
                </Text>
              </Card>
            )}

            {result.insights.map((insight, idx) => {
              const accentColor = colors[SEVERITY_COLOR_KEY[insight.severity]];
              return (
                <Animated.View
                  key={`${insight.type}-${idx}`}
                  entering={FadeInDown.delay(200 + idx * 80).duration(300)}>
                  <Card style={{...styles.insightCard, marginTop: spacing.sm}}>
                    <View style={styles.insightHeader}>
                      <View
                        style={[styles.insightIcon, {backgroundColor: `${accentColor}1A`, borderRadius: radius.sm}]}>
                        <Icon name={INSIGHT_ICON[insight.type]} size={20} color={accentColor} />
                      </View>
                      <View style={styles.insightText}>
                        <Text style={[styles.insightTitle, {color: colors.text}]} numberOfLines={2}>
                          {insight.title}
                        </Text>
                        <Text style={[typo.footnote, {color: colors.textSecondary}]} numberOfLines={3}>
                          {insight.description}
                        </Text>
                      </View>
                    </View>
                    {insight.savingsEstimate > 0 && (
                      <View style={[styles.savingsRow, {marginTop: spacing.xs}]}>
                        <Text style={[styles.savingsLabel, {color: colors.success}]}>
                          Potential savings: {formatAmountMasked(insight.savingsEstimate, baseCurrency, hide)}
                        </Text>
                      </View>
                    )}
                  </Card>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', paddingBottom: 8},
  scroll: {flexGrow: 1},
  summaryCard: {alignItems: 'center', gap: 4},
  totalSpent: {fontSize: 32, fontWeight: fontWeight.bold},
  compRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8},
  compCol: {alignItems: 'center', gap: 2},
  compValue: {fontSize: 16, fontWeight: fontWeight.semibold},
  emptyCard: {alignItems: 'center', gap: 12, paddingVertical: 24},
  insightCard: {},
  insightHeader: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  insightIcon: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  insightText: {flex: 1, gap: 2},
  insightTitle: {fontSize: 14, fontWeight: fontWeight.semibold},
  savingsRow: {paddingLeft: 48},
  savingsLabel: {fontSize: 12, fontWeight: fontWeight.semibold},
});
