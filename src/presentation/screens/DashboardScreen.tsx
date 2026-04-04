import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '@shared/theme';
import {ScreenContainer} from '@presentation/components/layout/ScreenContainer';
import {SectionHeader} from '@presentation/components/layout/SectionHeader';
import {Spacer} from '@presentation/components/layout/Spacer';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {ErrorState} from '@presentation/components/feedback/ErrorState';
import {BalanceHeader} from '@presentation/components/BalanceHeader';
import {SummaryPills} from '@presentation/components/SummaryPills';
import {QuickActions, type QuickAction} from '@presentation/components/QuickActions';
import {MiniBarChart} from '@presentation/components/charts/MiniBarChart';
import {InsightCard} from '@presentation/components/InsightCard';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {useDashboard} from '@presentation/hooks/useDashboard';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import type {HomeStackParamList} from '@presentation/navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

function categoryLookup(categoryId: string) {
  const cat = DEFAULT_CATEGORIES.find((c) => c.name === categoryId);
  return {
    name: cat?.name ?? 'Other',
    icon: cat?.icon ?? '?',
    color: cat?.color ?? '#B2BEC3',
  };
}

export default function DashboardScreen() {
  const {colors, spacing} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    totalBalance,
    baseCurrency,
    percentChange,
    monthIncome,
    monthExpenses,
    weeklySpending,
    recentTransactions,
    insights,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  const handleTransactionPress = useCallback(
    (id: string) => {
      navigation.navigate('TransactionDetail', {transactionId: id});
    },
    [navigation],
  );

  const quickActions = useMemo(
    (): QuickAction[] => [
      {
        label: 'Expense',
        icon: '💸',
        color: colors.expense,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'expense'},
          }),
      },
      {
        label: 'Income',
        icon: '💰',
        color: colors.income,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'income'},
          }),
      },
      {
        label: 'Transfer',
        icon: '🔄',
        color: colors.transfer,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'transfer'},
          }),
      },
      {
        label: 'Wallets',
        icon: '👛',
        color: colors.primary,
        onPress: () =>
          navigation.getParent()?.navigate('WalletsTab', {
            screen: 'WalletsList',
          }),
      },
    ],
    [colors, navigation],
  );

  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
    () => new Set(),
  );

  const handleDismissInsight = useCallback((key: string) => {
    setDismissedInsights((prev) => new Set(prev).add(key));
  }, []);

  const visibleInsights = useMemo(
    () => insights.filter((_, i) => !dismissedInsights.has(String(i))),
    [insights, dismissedInsights],
  );

  if (error && !isLoading && recentTransactions.length === 0) {
    return (
      <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <ErrorState message={error} onRetry={refetch} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />
        <BalanceHeader
          totalBalance={totalBalance}
          currency={baseCurrency}
          percentChange={percentChange}
          isLoading={isLoading}
        />
        <Spacer size={spacing.lg} />
        <SummaryPills
          income={monthIncome}
          expenses={monthExpenses}
          currency={baseCurrency}
          isLoading={isLoading}
        />
        <Spacer size={spacing.lg} />
        <QuickActions actions={quickActions} />
        <Spacer size={spacing.lg} />
      </View>

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <MiniBarChart
          data={weeklySpending}
          currency={baseCurrency}
          isLoading={isLoading}
        />
      </View>

      {visibleInsights.length > 0 && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <SectionHeader title="Insights" />
          {visibleInsights.map((insight, idx) => (
            <View key={`insight-${idx}`} style={styles.insightGap}>
              <InsightCard
                type={insight.type}
                title={insight.title}
                message={insight.message}
                severity={insight.severity}
                onDismiss={() => handleDismissInsight(String(idx))}
              />
            </View>
          ))}
        </View>
      )}

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.lg} />
        <SectionHeader
          title="Recent Transactions"
          actionLabel="See All"
          onAction={() =>
            navigation.getParent()?.navigate('TransactionsTab', {
              screen: 'TransactionsList',
            })
          }
        />
        {recentTransactions.length === 0 && !isLoading ? (
          <EmptyState
            title="No transactions yet"
            message="Tap the + button to add your first transaction"
          />
        ) : (
          recentTransactions.map((tx) => {
            const cat = categoryLookup(tx.categoryId);
            return (
              <View key={tx.id} style={styles.txGap}>
                <TransactionCard
                  id={tx.id}
                  amount={tx.amount}
                  currency={tx.currency}
                  type={tx.type}
                  categoryName={cat.name}
                  categoryIcon={cat.icon}
                  categoryColor={cat.color}
                  description={tx.description}
                  merchant={tx.merchant}
                  transactionDate={tx.transactionDate}
                  source={tx.source}
                  onPress={handleTransactionPress}
                />
              </View>
            );
          })
        )}
      </View>

      <Spacer size={spacing.xl} />

      {isLoading && recentTransactions.length === 0 && (
        <View
          style={[styles.padded, {paddingHorizontal: spacing.base}]}
          accessibilityLabel="Loading recent transactions">
          <Text style={{color: colors.textSecondary, textAlign: 'center'}}>
            Loading your data...
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {
    alignSelf: 'stretch',
  },
  insightGap: {
    marginTop: 8,
  },
  txGap: {
    marginTop: 6,
  },
});
