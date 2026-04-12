import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common/BackButton';
import {Card} from '@presentation/components/common/Card';
import {PaywallGate} from '@presentation/components/common/PaywallGate';
import {
  GenerateSpendingAutopsy,
  type AutopsyInsight,
} from '@domain/usecases/generate-spending-autopsy';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useCategories} from '@presentation/hooks/useCategories';

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

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(cents) / 100);
}

function currentAndPreviousMonthRange() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const currentEnd = now.getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const prevEnd = currentStart - 1;
  return {currentStart, currentEnd, prevStart, prevEnd};
}

export default function SpendingAutopsyScreen() {
  const {colors, spacing, radius, typography: typo} = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {transactions} = useTransactions();
  const {categories} = useCategories();

  const {currentStart, currentEnd, prevStart, prevEnd} =
    useMemo(() => currentAndPreviousMonthRange(), []);

  const result = useMemo(() => {
    const currentTxns = transactions
      .filter(
        (t) =>
          t.transactionDate >= currentStart && t.transactionDate <= currentEnd,
      )
      .map((t) => ({
        amount: t.amount,
        categoryId: t.categoryId,
        transactionDate: t.transactionDate,
        type: t.type as 'income' | 'expense' | 'transfer',
      }));

    const previousTxns = transactions
      .filter(
        (t) =>
          t.transactionDate >= prevStart && t.transactionDate <= prevEnd,
      )
      .map((t) => ({
        amount: t.amount,
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
  }, [transactions, categories, currentStart, currentEnd, prevStart, prevEnd]);

  const monthLabel = new Date().toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const changeSign = result.periodComparison.changePercent >= 0 ? '+' : '';
  const changeColor =
    result.periodComparison.changePercent > 0
      ? colors.danger
      : result.periodComparison.changePercent < 0
        ? colors.success
        : colors.textSecondary;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.base},
        ]}
      >
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[typo.headline, {color: colors.text, flex: 1, textAlign: 'center'}]}>
          Spending Autopsy
        </Text>
        <View style={{width: 32}} />
      </View>

      <PaywallGate feature="spendingAutopsy" featureLabel="Monthly Spending Autopsy">
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {padding: spacing.base, paddingBottom: insets.bottom + spacing.xl},
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card style={styles.summaryCard}>
              <Text style={[typo.caption, {color: colors.textSecondary}]}>
                {monthLabel}
              </Text>
              <Text style={[styles.totalSpent, {color: colors.text}]}>
                {formatCents(result.totalSpent)}
              </Text>
              <Text style={[typo.footnote, {color: changeColor}]}>
                {changeSign}{result.periodComparison.changePercent}% vs last month
              </Text>
              {result.topCategory !== 'None' && (
                <Text style={[typo.caption, {color: colors.textTertiary, marginTop: spacing.xs}]}>
                  Top category: {result.topCategory}
                </Text>
              )}
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
                entering={FadeInDown.delay(100 + idx * 80).duration(300)}
              >
                <Card
                  style={{...styles.insightCard, marginTop: spacing.sm}}
                >
                  <View style={styles.insightHeader}>
                    <View
                      style={[
                        styles.insightIcon,
                        {backgroundColor: `${accentColor}1A`, borderRadius: radius.sm},
                      ]}
                    >
                      <Icon
                        name={INSIGHT_ICON[insight.type]}
                        size={20}
                        color={accentColor}
                      />
                    </View>
                    <View style={styles.insightText}>
                      <Text
                        style={[styles.insightTitle, {color: colors.text}]}
                        numberOfLines={2}
                      >
                        {insight.title}
                      </Text>
                      <Text
                        style={[typo.footnote, {color: colors.textSecondary}]}
                        numberOfLines={3}
                      >
                        {insight.description}
                      </Text>
                    </View>
                  </View>
                  {insight.savingsEstimate > 0 && (
                    <View style={[styles.savingsRow, {marginTop: spacing.xs}]}>
                      <Text style={[styles.savingsLabel, {color: colors.success}]}>
                        Potential savings: {formatCents(insight.savingsEstimate)}
                      </Text>
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </ScrollView>
      </PaywallGate>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  scroll: {
    flexGrow: 1,
  },
  summaryCard: {
    alignItems: 'center',
    gap: 4,
  },
  totalSpent: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  insightCard: {},
  insightHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  savingsRow: {
    paddingLeft: 48,
  },
  savingsLabel: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
});
