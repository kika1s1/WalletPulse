import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useBudgets} from '@presentation/hooks/useBudgets';
import {useBudgetProgress, type BudgetProgressItem} from '@presentation/hooks/useBudgetProgress';
import {BackButton} from '@presentation/components/common';
import {BudgetCard} from '@presentation/components/BudgetCard';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import {AppIcon} from '@presentation/components/common/AppIcon';
type Nav = NativeStackNavigationProp<SettingsStackParamList, 'BudgetList'>;

function OverviewCard({
  totalBudget,
  totalSpent,
  count,
  currency,
  hide,
}: {
  totalBudget: number;
  totalSpent: number;
  count: number;
  currency: string;
  hide: boolean;
}) {
  const {colors, spacing, radius, shadows} = useTheme();
  const pct = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const pctLabel = Math.round(pct * 100);
  const barColor =
    pct > 1 ? colors.danger : pct >= 0.8 ? colors.danger : pct >= 0.5 ? colors.warning : colors.success;

  return (
    <View
      style={[
        styles.overviewCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          borderRadius: radius.lg,
          padding: spacing.base,
        },
        shadows.sm,
      ]}>
      <Text style={[styles.overviewTitle, {color: colors.text}]}>
        Budget Overview
      </Text>
      <Text style={[styles.overviewSub, {color: colors.textSecondary}]}>
        {count} active budget{count !== 1 ? 's' : ''}
      </Text>

      <View style={[styles.overviewAmounts, {marginTop: spacing.md}]}>
        <View>
          <Text style={[styles.overviewLabel, {color: colors.textTertiary}]}>
            TOTAL SPENT
          </Text>
          <Text style={[styles.overviewValue, {color: barColor}]}>
            {formatAmountMasked(totalSpent, currency, hide)}
          </Text>
        </View>
        <View style={styles.overviewRight}>
          <Text style={[styles.overviewLabel, {color: colors.textTertiary}]}>
            TOTAL BUDGET
          </Text>
          <Text style={[styles.overviewValue, {color: colors.text}]}>
            {formatAmountMasked(totalBudget, currency, hide)}
          </Text>
        </View>
      </View>

      <View style={{marginTop: spacing.md}}>
        <ProgressBar color={barColor} height={12} progress={pct} />
      </View>

      <Text
        style={[
          styles.overviewPct,
          {color: colors.textSecondary, marginTop: spacing.xs},
        ]}>
        {pctLabel}% of total budget used
      </Text>
    </View>
  );
}

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<Nav>();
  const {activeBudgets, isLoading, error, refetch} = useBudgets();
  const {
    items,
    overallItem,
    totalBudget,
    totalSpent,
    isLoading: progressLoading,
    refetch: refreshProgress,
  } = useBudgetProgress(activeBudgets);
  const hide = useSettingsStore((s) => s.hideAmounts);

  const currency = activeBudgets.length > 0 ? activeBudgets[0].currency : 'USD';
  const loading = isLoading || progressLoading;
  const hasAnyBudgets = activeBudgets.length > 0;

  const refreshData = useCallback(() => {
    refetch();
    refreshProgress();
  }, [refetch, refreshProgress]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );

  const handleBudgetPress = useCallback(
    (id: string) => {
      navigation.navigate('BudgetDetail', {budgetId: id});
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}: {item: BudgetProgressItem}) => (
      <BudgetCard
        amount={item.budget.amount}
        budgetId={item.budget.id}
        categoryColor={item.categoryColor}
        categoryName={item.categoryName}
        currency={item.budget.currency}
        onPress={handleBudgetPress}
        percentage={item.percentage.value}
        period={item.budget.period}
        remaining={item.remaining}
        rollover={item.budget.rollover}
        spent={item.spent}
        status={item.status}
      />
    ),
    [handleBudgetPress],
  );

  const keyExtractor = useCallback((item: BudgetProgressItem) => item.budget.id, []);
  const listItems = useMemo(
    () => (overallItem ? [overallItem, ...items] : items),
    [items, overallItem],
  );
  const overviewBudget = items.length > 0 ? totalBudget : overallItem?.budget.amount ?? 0;
  const overviewSpent = items.length > 0 ? totalSpent : overallItem?.spent ?? 0;

  const header = useMemo(() => {
    const parts: React.ReactNode[] = [];

    if (listItems.length > 0) {
      parts.push(
        <OverviewCard
          key="overview"
          count={listItems.length}
          currency={currency}
          hide={hide}
          totalBudget={overviewBudget}
          totalSpent={overviewSpent}
        />,
      );
    }

    return parts.length > 0 ? <>{parts}</> : null;
  }, [currency, hide, listItems.length, overviewBudget, overviewSpent]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
            paddingTop: insets.top + 12,
          },
        ]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Budgets
          </Text>
          <Pressable
            accessibilityLabel="Create budget"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              navigation.navigate('CreateBudget');
            }}
            style={styles.addBtnRow}>
            <Text style={[styles.addBtn, {color: colors.primary}]}>+ New</Text>
          </Pressable>
        </View>
      </View>

      {loading && !hasAnyBudgets ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading budgets...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <AppIcon name="alert-circle-outline" size={40} color={colors.danger} />
          <Text style={[styles.errorTitle, {color: colors.text}]}>
            Failed to load budgets
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={refreshData}
            style={[styles.retryBtn, {backgroundColor: colors.primary, borderRadius: radius.sm}]}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : !hasAnyBudgets ? (
        <View style={styles.center}>
          <AppIcon name="cash-multiple" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, {color: colors.text}]}>
            No budgets yet
          </Text>
          <Text style={[styles.emptyMsg, {color: colors.textSecondary}]}>
            Create your first budget to start tracking{'\n'}your spending against limits.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('CreateBudget')}
            style={[
              styles.createBtn,
              {backgroundColor: colors.primary, borderRadius: radius.md},
            ]}>
            <Text style={styles.createBtnText}>Create Budget</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={header}
          contentContainerStyle={{
            padding: spacing.base,
            gap: spacing.md,
            paddingBottom: insets.bottom + 24,
          }}
          data={listItems}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={refreshData}
              refreshing={loading}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  addBtn: {fontSize: 16, fontWeight: fontWeight.semibold},
  addBtnRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  overviewCard: {borderWidth: StyleSheet.hairlineWidth},
  overviewTitle: {fontSize: 18, fontWeight: fontWeight.bold},
  overviewSub: {fontSize: 13, marginTop: 2},
  overviewAmounts: {flexDirection: 'row', justifyContent: 'space-between'},
  overviewRight: {alignItems: 'flex-end'},
  overviewLabel: {fontSize: 11, fontWeight: fontWeight.semibold, letterSpacing: 0.5},
  overviewValue: {fontSize: 18, fontWeight: fontWeight.bold, marginTop: 2},
  overviewPct: {fontSize: 13, textAlign: 'center'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  loadingText: {fontSize: 14, marginTop: 12},
  errorEmoji: {fontSize: 40},
  errorTitle: {fontSize: 18, fontWeight: fontWeight.semibold, marginTop: 12},
  retryBtn: {marginTop: 16, paddingHorizontal: 24, paddingVertical: 10},
  retryText: {color: '#FFFFFF', fontSize: 14, fontWeight: fontWeight.semibold},
  emptyEmoji: {fontSize: 48},
  emptyTitle: {fontSize: 20, fontWeight: fontWeight.bold, marginTop: 12},
  emptyMsg: {fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8},
  createBtn: {marginTop: 20, paddingHorizontal: 28, paddingVertical: 12},
  createBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: fontWeight.semibold},
});
