import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
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
import {WalletPulseLogo} from '@presentation/components/WalletPulseLogo';
import {useDashboard} from '@presentation/hooks/useDashboard';
import {useBudgets} from '@presentation/hooks/useBudgets';
import {useBudgetProgress} from '@presentation/hooks/useBudgetProgress';
import {BudgetSummaryWidget} from '@presentation/components/BudgetSummaryWidget';
import {useCategories} from '@presentation/hooks/useCategories';
import type {HomeStackParamList} from '@presentation/navigation/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function DashboardScreen() {
  const {colors, spacing} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const {categories} = useCategories();

  const resolveCategory = useCallback(
    (categoryId: string) => {
      const cat = categories.find(
        (c) => c.id === categoryId || c.name === categoryId,
      );
      return {
        name: cat?.name ?? 'Other',
        icon: cat?.icon ?? '?',
        color: cat?.color ?? '#B2BEC3',
      };
    },
    [categories],
  );

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

  const {activeBudgets} = useBudgets();
  const {items: budgetItems, totalBudget, totalSpent} = useBudgetProgress(activeBudgets);

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
        icon: 'arrow-down-circle-outline',
        color: colors.expense,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'expense'},
          }),
      },
      {
        label: 'Income',
        icon: 'arrow-up-circle-outline',
        color: colors.income,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'income'},
          }),
      },
      {
        label: 'Transfer',
        icon: 'swap-horizontal',
        color: colors.transfer,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'transfer'},
          }),
      },
      {
        label: 'Wallets',
        icon: 'wallet-outline',
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
        <Spacer size={spacing.sm} />
        <View style={styles.brandHeader}>
          <WalletPulseLogo size={32} variant="full" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search transactions"
            onPress={() =>
              navigation.getParent()?.navigate('TransactionsTab', {
                screen: 'Search',
              })
            }
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
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

      {budgetItems.length > 0 && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <BudgetSummaryWidget
            items={budgetItems}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            currency={baseCurrency}
            onPress={() =>
              navigation.getParent()?.navigate('SettingsTab', {
                screen: 'BudgetList',
              })
            }
          />
        </View>
      )}

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
            const cat = resolveCategory(tx.categoryId);
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
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  insightGap: {
    marginTop: 8,
  },
  txGap: {
    marginTop: 6,
  },
});
