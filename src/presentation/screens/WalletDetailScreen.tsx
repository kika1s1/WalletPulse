import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {formatAmount} from '@shared/utils/format-currency';
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
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';
import type {WalletsStackParamList} from '@presentation/navigation/types';

type WalletDetailRoute = RouteProp<WalletsStackParamList, 'WalletDetail'>;

function categoryLookup(categoryId: string) {
  const cat = DEFAULT_CATEGORIES.find((c) => c.name === categoryId);
  return {
    name: cat?.name ?? 'Other',
    icon: cat?.icon ?? '?',
    color: cat?.color ?? '#B2BEC3',
  };
}

export default function WalletDetailScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const route = useRoute<WalletDetailRoute>();
  const {walletId} = route.params;
  const [refreshing, setRefreshing] = useState(false);

  const {wallets, isLoading: walletLoading, refetch: walletRefetch} = useWallets();
  const wallet = useMemo(
    () => wallets.find((w) => w.id === walletId) ?? null,
    [wallets, walletId],
  );

  const {
    transactions,
    isLoading: txLoading,
    error: txError,
    refetch: txRefetch,
  } = useTransactions({
    syncWithFilterStore: false,
    filter: {walletId},
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    walletRefetch();
    txRefetch();
    setTimeout(() => setRefreshing(false), 600);
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
                <Text style={styles.walletIconText}>{wallet.icon}</Text>
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
              {formatAmount(wallet.balance, wallet.currency)}
            </Text>
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
              {formatAmount(income, currency)}
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
              {formatAmount(expenses, currency)}
            </Text>
          </Card>
        </View>
      </View>

      <Spacer size={spacing.lg} />

      <View style={[styles.padded, {paddingHorizontal: spacing.base}]}>
        <SectionHeader
          title="Transactions"
          actionLabel={`${transactions.length}`}
        />

        {txError ? (
          <ErrorState message={txError} onRetry={txRefetch} />
        ) : transactions.length === 0 && !isLoading ? (
          <EmptyState
            title="No transactions"
            message="Transactions in this wallet will appear here."
          />
        ) : (
          transactions.slice(0, 20).map((tx) => {
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
                />
              </View>
            );
          })
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
  txGap: {
    marginTop: 6,
  },
});
