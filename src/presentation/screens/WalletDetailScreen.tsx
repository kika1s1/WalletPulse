import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
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
import {ErrorState} from '@presentation/components/feedback/ErrorState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {useWallets} from '@presentation/hooks/useWallets';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useCategories} from '@presentation/hooks/useCategories';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type {WalletsStackParamList} from '@presentation/navigation/types';
import {navigateToTab} from '@presentation/navigation/navigateToTab';
import {transactionLedgerDeltaCentsFromTransaction} from '@domain/value-objects/WalletTransferNotes';

type WalletDetailRoute = RouteProp<WalletsStackParamList, 'WalletDetail'>;
type WalletDetailNav = NativeStackNavigationProp<WalletsStackParamList, 'WalletDetail'>;

export default function WalletDetailScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<WalletDetailNav>();
  const route = useRoute<WalletDetailRoute>();
  const {walletId} = route.params;
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
        color: cat?.color ?? colors.textTertiary,
      };
    },
    [categories, colors.textTertiary],
  );

  const openAllTransactions = useCallback(() => {
    navigateToTab(navigation, 'TransactionsTab', {
      screen: 'TransactionsList',
      params: {filterWalletId: walletId},
    });
  }, [navigation, walletId]);

  const {wallets, isLoading: walletLoading, refetch: walletRefetch, deleteWallet} = useWallets();
  const wallet = useMemo(
    () => wallets.find((w) => w.id === walletId) ?? null,
    [wallets, walletId],
  );

  const txFilter = useMemo(() => ({walletId}), [walletId]);
  const {
    transactions,
    isLoading: txLoading,
    error: txError,
    refetch: txRefetch,
  } = useTransactions({
    syncWithFilterStore: false,
    filter: txFilter,
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
              deleteTransaction(id).catch((e) =>
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete the transaction.'),
              );
            },
          },
        ],
      );
    },
    [deleteTransaction],
  );

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    walletRefetch();
    txRefetch();
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 600);
  }, [walletRefetch, txRefetch]);

  const isLoading = walletLoading || txLoading;

  const income = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const expenses = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const hide = useSettingsStore((s) => s.hideAmounts);

  const ledgerBalance = useMemo(() => {
    let cents = 0;
    for (const t of transactions) {
      cents += transactionLedgerDeltaCentsFromTransaction(t);
    }
    return cents;
  }, [transactions]);

  const balanceMismatch = wallet ? Math.abs(wallet.balance - ledgerBalance) > 0 : false;

  const handleDeleteWallet = useCallback(() => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently delete this wallet and all its transactions. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet(walletId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete the wallet.');
            }
          },
        },
      ],
    );
  }, [deleteWallet, walletId, navigation]);

  if (!wallet && !isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
          <Spacer size={spacing.xl} />
          <ErrorState message="Wallet not found" />
        </View>
      </ScreenContainer>
    );
  }

  const currency = wallet?.currency ?? 'USD';

  return (
    <ScreenContainer onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <Spacer size={spacing.base} />

        {wallet && !isLoading ? (
          <View style={styles.headerActions}>
            <View style={{flex: 1}} />
            <Pressable
              accessibilityLabel="Edit wallet"
              accessibilityRole="button"
              hitSlop={12}
              onPress={() =>
                navigation.navigate('CreateWallet', {editWalletId: walletId})
              }>
              <Text style={[styles.editLabel, {color: colors.primary}]}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Delete wallet"
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleDeleteWallet}>
              <Text style={[styles.editLabel, {color: colors.danger}]}>Delete</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && !wallet ? (
          <>
            <Skeleton width={160} height={28} borderRadius={radius.sm} />
            <Spacer size={8} />
            <Skeleton width="80%" height={36} borderRadius={radius.sm} />
          </>
        ) : wallet ? (
          <>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.walletIcon,
                  {backgroundColor: `${wallet.color}1A`},
                ]}>
                <AppIcon name={resolveIconName(wallet.icon)} size={22} color={wallet.color} />
              </View>
              <View style={styles.headerTextBlock}>
                <Text
                  style={[styles.walletName, {color: colors.text}]}
                  numberOfLines={1}>
                  {wallet.name}
                </Text>
                <Text
                  style={[styles.currencyLabel, {color: colors.textSecondary}]}>
                  {wallet.currency}
                  {!wallet.isActive ? ' (Inactive)' : ''}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.balanceAmount,
                {
                  color: wallet.balance < 0 ? colors.danger : colors.text,
                  marginTop: spacing.sm,
                },
              ]}>
              {formatAmountMasked(wallet.balance, wallet.currency, hide)}
            </Text>

            {!txLoading && balanceMismatch && (
              <View style={[styles.reconcileRow, {marginTop: spacing.sm}]}>
                <AppIcon name="alert-circle-outline" size={14} color={colors.warning} />
                <Text style={[styles.reconcileText, {color: colors.warning}]}>
                  Ledger: {formatAmountMasked(ledgerBalance, wallet.currency, hide)}
                </Text>
                <Pressable
                  accessibilityLabel="Reconcile wallet balance"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    Alert.alert(
                      'Reconcile Balance',
                      `Update stored balance to match the calculated total from all transactions (${formatAmountMasked(ledgerBalance, wallet.currency, false)})?`,
                      [
                        {text: 'Cancel', style: 'cancel'},
                        {
                          text: 'Reconcile',
                          onPress: async () => {
                            try {
                              const ds = await import('@data/datasources/LocalDataSource');
                              await ds.getLocalDataSource().wallets.updateBalance(walletId, ledgerBalance);
                              walletRefetch();
                            } catch {
                              Alert.alert('Error', 'Failed to reconcile balance.');
                            }
                          },
                        },
                      ],
                    );
                  }}>
                  <Text style={[styles.reconcileAction, {color: colors.primary}]}>Reconcile</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        <Spacer size={spacing.lg} />

        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding="sm">
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
              Income
            </Text>
            <Text
              style={[
                styles.statValue,
                {color: colors.income},
              ]}>
              {formatAmountMasked(income, currency, hide)}
            </Text>
          </Card>
          <View style={{width: 12}} />
          <Card style={styles.statCard} padding="sm">
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>
              Expenses
            </Text>
            <Text
              style={[
                styles.statValue,
                {color: colors.expense},
              ]}>
              {formatAmountMasked(expenses, currency, hide)}
            </Text>
          </Card>
        </View>

        <Spacer size={spacing.base} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View balance history for this wallet"
          onPress={() =>
            navigation.navigate('WalletBalanceHistory', {walletId})
          }
          style={({pressed}) => [
            styles.historyLink,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.lg,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={wallet?.color ?? colors.primary} />
          <View style={styles.historyLinkText}>
            <Text style={[styles.historyLinkTitle, {color: colors.text}]}>
              Balance History
            </Text>
            <Text style={[styles.historyLinkSub, {color: colors.textSecondary}]}>
              Track this wallet's balance in {currency}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      <Spacer size={spacing.lg} />

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <SectionHeader
          title="Transactions"
          actionLabel={`${transactions.length}`}
        />

        {txError ? (
          <ErrorState message={txError} onRetry={txRefetch} />
        ) : txLoading && transactions.length === 0 ? (
          <View style={styles.txSkeletonCol}>
            <Skeleton borderRadius={radius.md} height={72} width="100%" />
            <View style={{height: spacing.sm}} />
            <Skeleton borderRadius={radius.md} height={72} width="100%" />
            <View style={{height: spacing.sm}} />
            <Skeleton borderRadius={radius.md} height={72} width="100%" />
            <View style={{height: spacing.sm}} />
            <Skeleton borderRadius={radius.md} height={72} width="100%" />
          </View>
        ) : transactions.length === 0 && !isLoading ? (
          <EmptyState
            title="No transactions"
            message="Transactions in this wallet will appear here."
          />
        ) : (
          <>
            {transactions.slice(0, 20).map((tx) => {
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
                    hideAmounts={hide}
                    onPress={openTxDetail}
                    onEdit={openTxEdit}
                    onDelete={confirmTxDelete}
                  />
                </View>
              );
            })}
            {transactions.length > 0 ? (
              <Pressable
                accessibilityLabel="View all transactions for this wallet"
                accessibilityRole="button"
                onPress={openAllTransactions}
                style={({pressed}) => [
                  styles.viewAllBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    marginTop: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.viewAllBtnText, {color: colors.primary}]}>
                  View All Transactions
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <Spacer size={spacing.xl} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  padded: {
    alignSelf: 'stretch',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: fontWeight.medium,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconText: {
    fontSize: 24,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  currencyLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  reconcileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reconcileText: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  reconcileAction: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginLeft: 4,
  },
  txGap: {
    marginTop: 6,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  historyLinkText: {
    flex: 1,
    minWidth: 0,
  },
  historyLinkTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyLinkSub: {
    fontSize: 12,
    marginTop: 2,
  },
  txSkeletonCol: {
    marginTop: 4,
  },
  viewAllBtn: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  viewAllBtnText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
});
