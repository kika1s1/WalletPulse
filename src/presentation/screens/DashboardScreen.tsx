import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
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
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {
  HealthScoreCard,
  PaydayPlannerSheet,
} from '@presentation/components/common';
import {WalletPulseLogo} from '@presentation/components/WalletPulseLogo';
import {WalletSwitcher} from '@presentation/components/WalletSwitcher';
import {useDashboard} from '@presentation/hooks/useDashboard';
import {useBudgets} from '@presentation/hooks/useBudgets';
import {useBillReminders} from '@presentation/hooks/useBillReminders';
import {useSubscriptions} from '@presentation/hooks/useSubscriptions';
import {useGoals} from '@presentation/hooks/useGoals';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useBudgetProgress} from '@presentation/hooks/useBudgetProgress';
import {BudgetSummaryWidget} from '@presentation/components/BudgetSummaryWidget';
import {useCategories} from '@presentation/hooks/useCategories';
import {CalculateHealthScore} from '@domain/usecases/calculate-health-score';
import {CalculatePaydayPlan} from '@domain/usecases/calculate-payday-plan';
import type {HomeStackParamList} from '@presentation/navigation/types';
import {navigateToTab} from '@presentation/navigation/navigateToTab';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function DashboardScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const [refreshing, setRefreshing] = useState(false);
  const {categories} = useCategories();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);

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
    displayCurrency,
    displayBalance,
    percentChange,
    monthIncome,
    monthExpenses,
    prevMonthExpenses,
    weeklySpending,
    recentTransactions,
    insights,
    wallets,
    selectedWalletId,
    setSelectedWalletId,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  const {activeBudgets} = useBudgets();
  const {bills} = useBillReminders();
  const {subscriptions} = useSubscriptions();
  const {goals} = useGoals();
  const {items: budgetItems, totalBudget, totalSpent} = useBudgetProgress(activeBudgets);
  const paydaySheetRef = useRef<BottomSheet>(null);
  const [paydayDismissed, setPaydayDismissed] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  const wasRefreshing = useRef(false);
  if (refreshing && !isLoading) {
    if (wasRefreshing.current) {
      setRefreshing(false);
      wasRefreshing.current = false;
    }
  }
  if (refreshing && isLoading) {
    wasRefreshing.current = true;
  }

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
          navigateToTab(navigation, 'TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'expense', walletId: selectedWalletId ?? undefined},
          }),
      },
      {
        label: 'Income',
        icon: 'arrow-up-circle-outline',
        color: colors.income,
        onPress: () =>
          navigateToTab(navigation, 'TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'income', walletId: selectedWalletId ?? undefined},
          }),
      },
      {
        label: 'Transfer',
        icon: 'swap-horizontal',
        color: colors.transfer,
        onPress: () =>
          navigateToTab(navigation, 'TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'transfer', walletId: selectedWalletId ?? undefined},
          }),
      },
      {
        label: 'Wallets',
        icon: 'wallet-outline',
        color: colors.primary,
        onPress: () =>
          navigateToTab(navigation, 'WalletsTab', {
            screen: 'WalletsList',
          }),
      },
    ],
    [colors, navigation, selectedWalletId],
  );

  const billsOnTimePercent = useMemo(() => {
    if (bills.length === 0) {return 100;}
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86_400_000;
    const recentBills = bills.filter((b) => b.dueDate >= thirtyDaysAgo && b.dueDate <= now);
    if (recentBills.length === 0) {return 100;}
    const paidOnTime = recentBills.filter((b) => b.isPaid).length;
    return Math.round((paidOnTime / recentBills.length) * 100);
  }, [bills]);

  const subscriptionCounts = useMemo(() => {
    const active = subscriptions.filter((s) => s.isActive);
    const now = Date.now();
    const sixtyDaysAgo = now - 60 * 86_400_000;
    const recentlyUsed = active.filter((s) => s.nextDueDate >= sixtyDaysAgo);
    return {active: active.length, used: recentlyUsed.length};
  }, [subscriptions]);

  const emergencyFundProgress = useMemo(() => {
    const emergencyGoals = goals.filter(
      (g) => g.category === 'emergency' && !g.isCompleted,
    );
    if (emergencyGoals.length === 0) {
      const targetMonths = 3;
      const monthlyExpenseTarget = monthExpenses > 0 ? monthExpenses * targetMonths : 0;
      if (monthlyExpenseTarget <= 0) {return 50;}
      const totalSavings = wallets
        .filter((w) => w.isActive)
        .reduce((sum, w) => sum + Math.max(w.balance, 0), 0);
      return Math.min(Math.round((totalSavings / monthlyExpenseTarget) * 100), 100);
    }
    const totalProgress = emergencyGoals.reduce((sum, g) => {
      if (g.targetAmount <= 0) {return sum + 100;}
      return sum + Math.min((g.currentAmount / g.targetAmount) * 100, 100);
    }, 0);
    return Math.round(totalProgress / emergencyGoals.length);
  }, [goals, monthExpenses, wallets]);

  const healthScoreResult = useMemo(() => {
    if (monthIncome === 0 && monthExpenses === 0) {return null;}

    const calculator = new CalculateHealthScore();
    return calculator.execute({
      totalIncome: monthIncome,
      totalExpenses: monthExpenses,
      budgetAdherencePercent:
        totalBudget > 0
          ? Math.round(Math.min((1 - totalSpent / totalBudget) * 100, 100))
          : 100,
      billsOnTimePercent,
      activeSubscriptionCount: subscriptionCounts.active,
      usedSubscriptionCount: subscriptionCounts.used,
      emergencyFundProgress,
      previousPeriodExpenses: prevMonthExpenses,
    });
  }, [monthIncome, monthExpenses, totalBudget, totalSpent, billsOnTimePercent, subscriptionCounts, emergencyFundProgress, prevMonthExpenses]);

  const latestIncome = useMemo(() => {
    if (paydayDismissed) {return null;}
    const oneDayAgo = Date.now() - 86_400_000;
    return recentTransactions.find(
      (t) => t.type === 'income' && t.transactionDate >= oneDayAgo,
    ) ?? null;
  }, [recentTransactions, paydayDismissed]);

  const paydayResult = useMemo(() => {
    if (!latestIncome) {return null;}
    const planner = new CalculatePaydayPlan();
    const upcomingBills = bills
      .filter((b) => !b.isPaid && b.dueDate > Date.now())
      .map((b) => ({
        name: b.name,
        amount: b.amount,
        currency: b.currency,
        dueDate: b.dueDate,
      }));
    const budgetEntries = activeBudgets.map((b) => ({
      name: b.categoryId ?? 'Budget',
      remaining: Math.max(b.amount - (budgetItems.find((bi) => bi.budget.id === b.id)?.spent ?? 0), 0),
      currency: b.currency,
    }));
    return planner.execute({
      incomeAmount: latestIncome.amount,
      incomeCurrency: latestIncome.currency,
      upcomingBills,
      activeBudgets: budgetEntries,
      currentWalletBalance: displayBalance,
    });
  }, [latestIncome, bills, activeBudgets, budgetItems, displayBalance]);

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
    <>
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.sm} />
        <View style={styles.brandHeader}>
          <WalletPulseLogo size={32} variant="full" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search transactions"
            onPress={() =>
              navigateToTab(navigation, 'TransactionsTab', {
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
          totalBalance={displayBalance}
          currency={displayCurrency}
          percentChange={percentChange}
          isLoading={isLoading}
        />
        <Spacer size={spacing.sm} />
        <WalletSwitcher
          wallets={wallets}
          totalBalance={totalBalance}
          baseCurrency={baseCurrency}
          selectedWalletId={selectedWalletId}
          onSelect={setSelectedWalletId}
        />
        <Spacer size={spacing.lg} />
        <SummaryPills
          income={monthIncome}
          expenses={monthExpenses}
          currency={displayCurrency}
          isLoading={isLoading}
        />
        <Spacer size={spacing.lg} />
        <QuickActions actions={quickActions} />
        <Spacer size={spacing.lg} />
      </View>

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <MiniBarChart
          data={weeklySpending}
          currency={displayCurrency}
          isLoading={isLoading}
        />
      </View>

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.lg} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View balance history"
          onPress={() =>
            navigateToTab(navigation, 'AnalyticsTab', {
              screen: 'BalanceHistory',
            })
          }
          style={({pressed}) => [
            styles.balanceHistoryLink,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={colors.primary} />
          <View style={styles.balanceHistoryLinkText}>
            <Text style={[styles.balanceHistoryTitle, {color: colors.text}]}>
              Balance History
            </Text>
            <Text style={[styles.balanceHistorySub, {color: colors.textSecondary}]}>
              Track your total balance over time
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      {budgetItems.length > 0 && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <BudgetSummaryWidget
            items={budgetItems}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            currency={displayCurrency}
            onPress={() =>
              navigateToTab(navigation, 'SettingsTab', {
                screen: 'BudgetList',
              })
            }
          />
        </View>
      )}

      {healthScoreResult && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <HealthScoreCard result={healthScoreResult} />
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
            navigateToTab(navigation, 'TransactionsTab', {
              screen: 'TransactionsList',
            })
          }
        />
        {isLoading && recentTransactions.length === 0 ? (
          <View style={{gap: spacing.sm}}>
            <Skeleton width="100%" height={68} borderRadius={radius.md} />
            <Skeleton width="100%" height={68} borderRadius={radius.md} />
            <Skeleton width="100%" height={68} borderRadius={radius.md} />
          </View>
        ) : recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            message="Tap the + button to add your first transaction"
            icon="cash-register"
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
                  notes={tx.notes}
                  transactionDate={tx.transactionDate}
                  source={tx.source}
                  hideAmounts={hideAmounts}
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

      {paydayResult && latestIncome && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.md} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open payday planner"
            onPress={() => paydaySheetRef.current?.snapToIndex(0)}
            style={[
              styles.paydayTrigger,
              {
                backgroundColor: `${colors.income}12`,
                borderColor: `${colors.income}33`,
                borderRadius: 12,
                padding: spacing.base,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="cash-check"
              size={22}
              color={colors.income}
            />
            <View style={styles.paydayTriggerText}>
              <Text style={{color: colors.text, fontWeight: '600', fontSize: 14}}>
                You received income today!
              </Text>
              <Text style={{color: colors.textSecondary, fontSize: 12}}>
                Tap to see your spending plan
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>
      )}
    </ScreenContainer>

    {paydayResult && latestIncome && (
      <PaydayPlannerSheet
        ref={paydaySheetRef}
        result={paydayResult}
        incomeFormatted={new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: latestIncome.currency,
          minimumFractionDigits: 0,
        }).format(latestIncome.amount / 100)}
        onDismiss={() => setPaydayDismissed(true)}
      />
    )}
    </>
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
  paydayTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  paydayTriggerText: {
    flex: 1,
    gap: 2,
  },
  balanceHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  balanceHistoryLinkText: {
    flex: 1,
    minWidth: 0,
  },
  balanceHistoryTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceHistorySub: {
    fontSize: 12,
    marginTop: 2,
  },
});
