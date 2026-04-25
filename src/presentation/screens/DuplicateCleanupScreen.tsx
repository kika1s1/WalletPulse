import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {Transaction} from '@domain/entities/Transaction';
import {findDuplicateTransactions} from '@domain/usecases/find-duplicate-transactions';
import type {TransactionsStackParamList} from '@presentation/navigation/types';
import {BackButton} from '@presentation/components/common';
import {EmptyState} from '@presentation/components/feedback';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {ErrorState} from '@presentation/components/feedback/ErrorState';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {useCategories} from '@presentation/hooks/useCategories';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

type Nav = NativeStackNavigationProp<TransactionsStackParamList, 'DuplicateCleanup'>;

const UNKNOWN_CATEGORY = {name: 'Other', icon: 'dots-horizontal', color: '#B2BEC3'} as const;

export default function DuplicateCleanupScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {colors, spacing, radius, typography} = useTheme();
  const {transactions, isLoading, error, refetch} = useTransactions({syncWithFilterStore: false});
  const {categories} = useCategories();
  const {deleteTransactions, isSubmitting} = useTransactionActions();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const [ignoredGroupIds, setIgnoredGroupIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keepId, setKeepId] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, {name: string; icon: string; color: string}>();
    for (const category of categories) {
      map.set(category.id, {name: category.name, icon: category.icon, color: category.color});
    }
    return map;
  }, [categories]);

  const groups = useMemo(
    () => findDuplicateTransactions(transactions)
      .filter((group) => !ignoredGroupIds.includes(group.id)),
    [ignoredGroupIds, transactions],
  );

  const activeGroup = groups[activeIndex] ?? null;

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(groups.length - 1, 0)));
  }, [groups.length]);

  useEffect(() => {
    setKeepId(activeGroup?.transactions[0]?.id ?? null);
  }, [activeGroup]);

  const getCategory = useCallback((transaction: Transaction) => (
    categoryById.get(transaction.categoryId) ?? UNKNOWN_CATEGORY
  ), [categoryById]);

  const ignoreGroup = useCallback(() => {
    if (!activeGroup) { return; }
    setIgnoredGroupIds((ids) => [...ids, activeGroup.id]);
  }, [activeGroup]);

  const deleteDuplicates = useCallback(() => {
    if (!activeGroup || !keepId) { return; }
    const deleteIds = activeGroup.transactions
      .map((transaction) => transaction.id)
      .filter((id) => id !== keepId);
    Alert.alert(
      'Delete duplicates?',
      `Keep 1 transaction and delete ${deleteIds.length} duplicate${deleteIds.length === 1 ? '' : 's'}.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete duplicates',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await deleteTransactions(deleteIds);
              setIgnoredGroupIds((ids) => [...ids, activeGroup.id]);
              refetch();
              Alert.alert('Cleanup complete', `${result.updatedIds.length} duplicate${result.updatedIds.length === 1 ? '' : 's'} deleted.`);
            })();
          },
        },
      ],
    );
  }, [activeGroup, deleteTransactions, keepId, refetch]);

  if (isLoading && transactions.length === 0) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + spacing.sm}]}>
        <Header title="Duplicate cleanup" onBack={navigation.goBack} />
        <View style={{padding: spacing.base, gap: spacing.sm}}>
          <Skeleton width="100%" height={90} borderRadius={radius.md} />
          <Skeleton width="100%" height={90} borderRadius={radius.md} />
        </View>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + spacing.sm}]}>
        <Header title="Duplicate cleanup" onBack={navigation.goBack} />
        <ErrorState message={error} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + spacing.sm}]}>
      <Header title="Duplicate cleanup" onBack={navigation.goBack} />
      {!activeGroup ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No possible duplicates"
            message="WalletPulse did not find transactions that look safe to review as duplicates."
            actionLabel="Refresh"
            onAction={refetch}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{padding: spacing.base, paddingBottom: insets.bottom + 32, gap: spacing.sm}}
          showsVerticalScrollIndicator={false}>
          <Text style={[typography.title3, {color: colors.text}]}>
            Group {activeIndex + 1} of {groups.length}
          </Text>
          <Text style={[styles.reason, {color: colors.textSecondary}]}>
            {activeGroup.reason}. Tap the transaction you want to keep.
          </Text>
          {activeGroup.transactions.map((transaction) => {
            const category = getCategory(transaction);
            const selected = transaction.id === keepId;
            return (
              <View key={transaction.id} style={styles.cardWrap}>
                <TransactionCard
                  id={transaction.id}
                  amount={transaction.amount}
                  categoryColor={category.color}
                  categoryIcon={category.icon}
                  categoryName={category.name}
                  currency={transaction.currency}
                  description={transaction.description}
                  merchant={transaction.merchant}
                  notes={transaction.notes}
                  source={transaction.source}
                  transactionDate={transaction.transactionDate}
                  type={transaction.type}
                  hideAmounts={hideAmounts}
                  selectable
                  selected={selected}
                  onToggleSelected={setKeepId}
                />
              </View>
            );
          })}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={ignoreGroup}
              style={[styles.secondaryButton, {borderColor: colors.border, borderRadius: radius.md}]}>
              <Text style={[styles.secondaryText, {color: colors.textSecondary}]}>Not duplicate</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={deleteDuplicates}
              style={[styles.primaryButton, {backgroundColor: colors.danger, borderRadius: radius.md, opacity: isSubmitting ? 0.7 : 1}]}>
              <Text style={styles.primaryText}>Delete others</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Header({title, onBack}: {title: string; onBack: () => void}) {
  const {colors, spacing, typography} = useTheme();
  return (
    <View style={[styles.header, {paddingHorizontal: spacing.base, borderBottomColor: colors.border}]}>
      <BackButton onPress={onBack} />
      <Text style={[typography.title2, {color: colors.text}]}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    width: 44,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardWrap: {
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
});
