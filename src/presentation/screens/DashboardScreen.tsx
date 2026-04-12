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
import {
  UpgradeInsightCard,
  TrialBanner,
  HealthScoreCard,
  PaydayPlannerSheet,
  AffiliateCard,
} from '@presentation/components/common';
import {WalletPulseLogo} from '@presentation/components/WalletPulseLogo';
import {WalletSwitcher} from '@presentation/components/WalletSwitcher';
import {useDashboard} from '@presentation/hooks/useDashboard';
import {useBudgets} from '@presentation/hooks/useBudgets';
import {useBillReminders} from '@presentation/hooks/useBillReminders';
import {useEntitlement} from '@presentation/hooks/useEntitlement';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useBudgetProgress} from '@presentation/hooks/useBudgetProgress';
import {BudgetSummaryWidget} from '@presentation/components/BudgetSummaryWidget';
import {useCategories} from '@presentation/hooks/useCategories';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';
import {CheckTrialStatus} from '@domain/usecases/check-trial-status';
import {CalculateHealthScore} from '@domain/usecases/calculate-health-score';
import {CalculatePaydayPlan} from '@domain/usecases/calculate-payday-plan';
import {GetAffiliateRecommendation} from '@domain/usecases/get-affiliate-recommendation';
import {monetizationAnalytics} from '@infrastructure/analytics/monetization-events';
import type {HomeStackParamList} from '@presentation/navigation/types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function DashboardScreen() {
  const {colors, spacing} = useTheme();
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
  const {items: budgetItems, totalBudget, totalSpent} = useBudgetProgress(activeBudgets);
  const {isFree, isTrialing, trialEndsAt, isPro, entitlement, canAccess} = useEntitlement();
  const paydaySheetRef = useRef<BottomSheet>(null);
  const [paydayDismissed, setPaydayDismissed] = useState(false);
  const [affiliateDismissed, setAffiliateDismissed] = useState(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
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
            params: {type: 'expense', walletId: selectedWalletId ?? undefined},
          }),
      },
      {
        label: 'Income',
        icon: 'arrow-up-circle-outline',
        color: colors.income,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'income', walletId: selectedWalletId ?? undefined},
          }),
      },
      {
        label: 'Transfer',
        icon: 'swap-horizontal',
        color: colors.transfer,
        onPress: () =>
          navigation.getParent()?.navigate('TransactionsTab', {
            screen: 'AddTransaction',
            params: {type: 'transfer', walletId: selectedWalletId ?? undefined},
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
    [colors, navigation, selectedWalletId],
  );

  // Trial banner data
  const trialStatus = useMemo(() => {
    if (!isTrialing || !trialEndsAt) {return null;}
    const checker = new CheckTrialStatus();
    return checker.execute({
      isTrialing,
      trialEndsAt,
      trialStartedAt: entitlement.purchasedAt,
    });
  }, [isTrialing, trialEndsAt, entitlement.purchasedAt]);

  // Health score (Pro+ only, needs data)
  const healthScoreResult = useMemo(() => {
    if (!canAccess('financialHealthScore')) {return null;}
    const totalIncome = monthIncome;
    const totalExpenses = monthExpenses;
    if (totalIncome === 0 && totalExpenses === 0) {return null;}

    const calculator = new CalculateHealthScore();
    return calculator.execute({
      totalIncome,
      totalExpenses,
      budgetAdherencePercent:
        totalBudget > 0
          ? Math.round(Math.min((1 - totalSpent / totalBudget) * 100, 100))
          : 100,
      billsOnTimePercent: 100,
      activeSubscriptionCount: 0,
      usedSubscriptionCount: 0,
      emergencyFundProgress: 0,
      previousPeriodExpenses: 0,
    });
  }, [canAccess, monthIncome, monthExpenses, totalBudget, totalSpent]);

  // Payday planner: detect recent income transactions to trigger the sheet
  const latestIncome = useMemo(() => {
    if (!canAccess('paydayPlanner') || paydayDismissed) {return null;}
    const oneDayAgo = Date.now() - 86_400_000;
    return recentTransactions.find(
      (t) => t.type === 'income' && t.transactionDate >= oneDayAgo,
    ) ?? null;
  }, [canAccess, recentTransactions, paydayDismissed]);

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

  // Affiliate recommendation
  const affiliateRec = useMemo(() => {
    if (affiliateDismissed) {return null;}
    const recommender = new GetAffiliateRecommendation();
    const walletCurrencies = wallets.map((w) => w.currency);
    const walletSources = wallets.map((w) => w.name.toLowerCase());
    return recommender.execute({
      currencies: walletCurrencies,
      existingSources: walletSources,
    });
  }, [affiliateDismissed, wallets]);

  const handleDismissAffiliate = useCallback(() => {
    setAffiliateDismissed(true);
    if (affiliateRec) {
      void monetizationAnalytics.trackUpgradePromptDismissed(`affiliate_${affiliateRec.partner.id}`);
    }
  }, [affiliateRec]);

  const handleAffiliateLearnMore = useCallback(() => {
    if (affiliateRec) {
      void monetizationAnalytics.trackAffiliateClicked(affiliateRec.partner.id);
    }
  }, [affiliateRec]);

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
        {trialStatus?.isActive && !trialBannerDismissed && trialStatus.daysRemaining != null && (
          <>
            <Spacer size={spacing.sm} />
            <TrialBanner
              daysRemaining={trialStatus.daysRemaining}
              onDismiss={() => setTrialBannerDismissed(true)}
            />
          </>
        )}
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

      {budgetItems.length > 0 && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <BudgetSummaryWidget
            items={budgetItems}
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            currency={displayCurrency}
            onPress={() =>
              navigation.getParent()?.navigate('SettingsTab', {
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

      {isFree && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <UpgradeInsightCard
            title="Unlock your full financial picture"
            description="Pro users get unlimited wallets, advanced analytics, export tools, and a Financial Health Score."
            ctaText="See Plans"
            icon="crown-outline"
            onPress={() => navigateToPaywall('dashboard_insight')}
          />
        </View>
      )}

      {affiliateRec && (
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.lg} />
          <AffiliateCard
            partner={affiliateRec.partner}
            context={affiliateRec.reason}
            onDismiss={handleDismissAffiliate}
            onLearnMore={handleAffiliateLearnMore}
          />
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
});
