import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import type {Budget} from '@domain/entities/Budget';
import {isOverallBudget} from '@domain/entities/Budget';
import type {CalculateBudgetProgressResult, BudgetProgressStatus} from '@domain/usecases/calculate-budget-progress';
import {makeCalculateBudgetProgress} from '@domain/usecases/calculate-budget-progress';
import {makeDeleteBudget} from '@domain/usecases/delete-budget';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import type {Category} from '@domain/entities/Category';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'BudgetDetail'>;
type Route = RouteProp<SettingsStackParamList, 'BudgetDetail'>;

function statusColor(
  status: BudgetProgressStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'exceeded':
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    default:
      return colors.success;
  }
}

function statusLabel(status: BudgetProgressStatus): string {
  switch (status) {
    case 'exceeded':
      return 'Over budget';
    case 'danger':
      return 'Almost there';
    case 'warning':
      return 'On track';
    default:
      return 'Under budget';
  }
}

function formatDateRange(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
  return `${s.toLocaleDateString(undefined, opts)} - ${e.toLocaleDateString(undefined, opts)}`;
}

function daysRemaining(endDate: number): number {
  const diff = endDate - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function BudgetDetailScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {budgetId} = route.params;

  const [budget, setBudget] = useState<Budget | null>(null);
  const [progress, setProgress] = useState<CalculateBudgetProgressResult | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const mountedRef = useRef(true);

  const filter = useMemo(() => {
    if (!budget) {
      return undefined;
    }
    return {
      type: 'expense' as const,
      currency: budget.currency,
      dateRange: {startMs: budget.startDate, endMs: budget.endDate},
      ...(budget.categoryId ? {categoryId: budget.categoryId} : {}),
    };
  }, [budget]);

  const {transactions, isLoading: txLoading, refetch: refetchTx} = useTransactions({
    filter,
    syncWithFilterStore: false,
  });
  const {deleteTransaction} = useTransactionActions();

  const openTxDetail = useCallback(
    (id: string) => navigation.navigate('TransactionDetail', {transactionId: id}),
    [navigation],
  );
  const openTxEdit = useCallback(
    (id: string) => navigation.navigate('EditTransaction', {transactionId: id}),
    [navigation],
  );
  const confirmTxDelete = useCallback(
    (id: string) => {
      Alert.alert(
        'Delete Transaction',
        'This will permanently delete this transaction and update the wallet balance.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteTransaction(id).catch(() =>
                Alert.alert('Error', 'Failed to delete the transaction.'),
              );
            },
          },
        ],
      );
    },
    [deleteTransaction],
  );

  const hide = useSettingsStore((s) => s.hideAmounts);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const ds = getLocalDataSource();
      const b = await ds.budgets.findById(budgetId);
      if (!b || !mountedRef.current) {
        return;
      }
      setBudget(b);

      const calc = makeCalculateBudgetProgress({
        budgetRepo: ds.budgets,
        transactionRepo: ds.transactions,
      });
      const p = await calc(budgetId);
      if (mountedRef.current) {
        setProgress(p);
      }

      if (!isOverallBudget(b) && b.categoryId) {
        const cat = await ds.categories.findById(b.categoryId);
        if (mountedRef.current) {
          setCategory(cat);
        }
      }
    } catch {
      // handled via null state
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [budgetId]);

  useEffect(() => {
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            const ds = getLocalDataSource();
            const del = makeDeleteBudget({budgetRepo: ds.budgets});
            await del(budgetId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete budget');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [budgetId, navigation]);

  const handleRefresh = useCallback(() => {
    fetchData();
    refetchTx();
  }, [fetchData, refetchTx]);

  if (isLoading || !budget || !progress) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const barColor = statusColor(progress.status, colors);
  const pct = progress.percentage.value;
  const catName = category?.name ?? 'Overall';
  const catColor = category?.color ?? colors.primary;
  const days = daysRemaining(budget.endDate);
  const dailyRemaining = days > 0 && progress.remaining > 0
    ? Math.round(progress.remaining / days)
    : 0;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
            paddingHorizontal: spacing.base,
          },
        ]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtn, {color: colors.primary}]}>← Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>
            Budget Detail
          </Text>
          <View style={{flexDirection: 'row', gap: 16}}>
            <Pressable
              accessibilityLabel="Edit budget"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() =>
                navigation.navigate('CreateBudget', {editBudgetId: budgetId})
              }>
              <Text style={[styles.deleteBtn, {color: colors.primary}]}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Delete budget"
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleDelete}>
              <Text style={[styles.deleteBtn, {color: colors.danger}]}>
                {isDeleting ? '...' : 'Delete'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={{gap: spacing.md}}>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
                shadows.md,
              ]}>
              <View style={styles.heroTopRow}>
                <View style={[styles.heroDot, {backgroundColor: catColor}]} />
                <Text style={[styles.heroName, {color: colors.text}]}>
                  {catName}
                </Text>
                <View
                  style={[
                    styles.heroStatusPill,
                    {backgroundColor: `${barColor}22`},
                  ]}>
                  <Text style={[styles.heroStatusText, {color: barColor}]}>
                    {statusLabel(progress.status)}
                  </Text>
                </View>
              </View>

              <View style={[styles.heroAmountRow, {marginTop: spacing.lg}]}>
                <Text style={[styles.heroSpentLabel, {color: colors.textTertiary}]}>
                  Spent
                </Text>
                <Text style={[styles.heroSpent, {color: barColor}]}>
                  {formatAmountMasked(progress.spent, budget.currency, hide)}
                </Text>
                <Text style={[styles.heroOf, {color: colors.textSecondary}]}>
                  of {formatAmountMasked(budget.amount, budget.currency, hide)}
                </Text>
              </View>

              <View style={{marginTop: spacing.md}}>
                <ProgressBar
                  color={barColor}
                  height={14}
                  progress={Math.min(pct / 100, 1)}
                />
              </View>

              <Text
                style={[
                  styles.heroPct,
                  {color: colors.textSecondary, marginTop: spacing.sm},
                ]}>
                {Math.round(pct)}% used
              </Text>
            </View>

            <View style={[styles.statsRow, {gap: spacing.sm}]}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                  Remaining
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    {color: progress.remaining >= 0 ? colors.success : colors.danger},
                  ]}>
                  {formatAmountMasked(Math.abs(progress.remaining), budget.currency, hide)}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                  Days Left
                </Text>
                <Text style={[styles.statValue, {color: colors.text}]}>
                  {days}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>
                  Daily Limit
                </Text>
                <Text style={[styles.statValue, {color: colors.text}]}>
                  {dailyRemaining > 0
                    ? formatAmountMasked(dailyRemaining, budget.currency, hide)
                    : '--'}
                </Text>
              </View>
            </View>

            <View style={[styles.metaCard, {backgroundColor: colors.card, borderColor: colors.borderLight, borderRadius: radius.md, padding: spacing.md}]}>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, {color: colors.textTertiary}]}>Period</Text>
                <Text style={[styles.metaValue, {color: colors.text}]}>
                  {budget.period === 'monthly' ? 'Monthly' : 'Weekly'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, {color: colors.textTertiary}]}>Date Range</Text>
                <Text style={[styles.metaValue, {color: colors.text}]}>
                  {formatDateRange(budget.startDate, budget.endDate)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, {color: colors.textTertiary}]}>Rollover</Text>
                <Text style={[styles.metaValue, {color: colors.text}]}>
                  {budget.rollover ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, {color: colors.textTertiary}]}>Transactions</Text>
                <Text style={[styles.metaValue, {color: colors.text}]}>
                  {transactions.length}
                </Text>
              </View>
            </View>

            {transactions.length > 0 && (
              <Text style={[styles.txHeader, {color: colors.text, marginTop: spacing.sm}]}>
                Transactions in this budget
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{
          padding: spacing.base,
          gap: spacing.sm,
          paddingBottom: spacing['3xl'],
        }}
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={handleRefresh}
            refreshing={isLoading || txLoading}
            tintColor={colors.primary}
          />
        }
        renderItem={({item}) => (
          <TransactionCard
            amount={item.amount}
            categoryColor={catColor}
            categoryIcon="cash-multiple"
            categoryName={catName}
            currency={item.currency}
            description={item.description}
            id={item.id}
            merchant={item.merchant}
            notes={item.notes}
            source={item.source}
            transactionDate={item.transactionDate}
            type={item.type}
            onPress={openTxDetail}
            onEdit={openTxEdit}
            onDelete={confirmTxDelete}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {fontSize: 16, fontWeight: fontWeight.medium},
  headerTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  deleteBtn: {fontSize: 14, fontWeight: fontWeight.semibold},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  heroCard: {borderWidth: StyleSheet.hairlineWidth},
  heroTopRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  heroDot: {width: 14, height: 14, borderRadius: 7},
  heroName: {fontSize: 20, fontWeight: fontWeight.bold, flex: 1},
  heroStatusPill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12},
  heroStatusText: {fontSize: 12, fontWeight: fontWeight.semibold},
  heroAmountRow: {alignItems: 'center'},
  heroSpentLabel: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase'},
  heroSpent: {fontSize: 32, fontWeight: fontWeight.bold, marginTop: 4},
  heroOf: {fontSize: 14, marginTop: 4},
  heroPct: {fontSize: 14, textAlign: 'center'},
  statsRow: {flexDirection: 'row'},
  statCard: {flex: 1, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center'},
  statLabel: {fontSize: 11, fontWeight: fontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase'},
  statValue: {fontSize: 16, fontWeight: fontWeight.bold, marginTop: 4},
  metaCard: {borderWidth: StyleSheet.hairlineWidth, gap: 10},
  metaRow: {flexDirection: 'row', justifyContent: 'space-between'},
  metaLabel: {fontSize: 13},
  metaValue: {fontSize: 13, fontWeight: fontWeight.medium},
  txHeader: {fontSize: 16, fontWeight: fontWeight.semibold},
});
