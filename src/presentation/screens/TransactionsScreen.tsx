import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Pressable, RefreshControl, SectionList, StyleSheet, Text, View, ScrollView} from 'react-native';
import type {CompositeNavigationProp, RouteProp} from '@react-navigation/native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {ScreenContainer, SectionHeader} from '@presentation/components/layout';
import {EmptyState} from '@presentation/components/feedback';
import {ErrorState} from '@presentation/components/feedback/ErrorState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {Chip} from '@presentation/components/common';
import {QuickActionsFAB} from '@presentation/components/QuickActionsFAB';
import {applyTemplate} from '@domain/usecases/quick-action-templates';
import type {TransactionTemplate} from '@domain/usecases/quick-action-templates';
import {buildAddTransactionParamsFromApplied} from '@presentation/navigation/build-add-transaction-params';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {toDateString, isToday} from '@shared/utils/date-helpers';
import type {Transaction} from '@domain/entities/Transaction';
import type {TabParamList, TransactionsStackParamList} from '@presentation/navigation/types';
import {useTransactions} from '@presentation/hooks/useTransactions';
import {useTransactionActions} from '@presentation/hooks/useTransactionActions';
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useFilterStore, type TransactionTypeFilter} from '@presentation/stores/useFilterStore';
import {useTransactionSelectionStore} from '@presentation/stores/useTransactionSelectionStore';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {TransactionBulkActionsHost} from '@presentation/components/transactions/TransactionBulkActionsHost';

const MS_PER_DAY = 86400000;

const UNKNOWN_CATEGORY = {name: 'Other', icon: '•', color: '#B2BEC3'} as const;

type TransactionsNav = CompositeNavigationProp<
  NativeStackNavigationProp<TransactionsStackParamList, 'TransactionsList'>,
  BottomTabNavigationProp<TabParamList>
>;

function isYesterday(ts: number, refMs: number): boolean {
  return toDateString(ts) === toDateString(refMs - MS_PER_DAY);
}

function sectionTitleForDay(ts: number, refMs: number): string {
  if (isToday(ts)) {
    return 'Today';
  }
  if (isYesterday(ts, refMs)) {
    return 'Yesterday';
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(ts);
}

function groupTransactionsByDate(transactions: Transaction[], refMs: number = Date.now()) {
  const sorted = [...transactions].sort((a, b) => b.transactionDate - a.transactionDate);
  const map = new Map<string, Transaction[]>();
  for (const t of sorted) {
    const key = toDateString(t.transactionDate);
    const bucket = map.get(key) ?? [];
    bucket.push(t);
    map.set(key, bucket);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((key) => {
    const data = map.get(key)!;
    const title = sectionTitleForDay(data[0].transactionDate, refMs);
    return {title, data};
  });
}

export default function TransactionsScreen() {
  const navigation = useNavigation<TransactionsNav>();
  const route = useRoute<RouteProp<TransactionsStackParamList, 'TransactionsList'>>();
  const filterCategoryId = route.params?.filterCategoryId;
  const filterWalletId = route.params?.filterWalletId;
  const {colors, spacing, radius, typography} = useTheme();
  const insets = useSafeAreaInsets();

  const typeFilter = useFilterStore((s) => s.typeFilter);
  const setTypeFilter = useFilterStore((s) => s.setTypeFilter);

  const {transactions: allTransactions, isLoading, error, refetch} = useTransactions();
  const {deleteTransaction} = useTransactionActions();
  const {categories} = useCategories();
  const {wallets} = useWallets();
  const hideAmounts = useSettingsStore((s) => s.hideAmounts);
  const isSelecting = useTransactionSelectionStore((s) => s.isSelecting);
  const selectedIds = useTransactionSelectionStore((s) => s.selectedIds);
  const toggleSelected = useTransactionSelectionStore((s) => s.toggleSelected);

  const transactions = useMemo(() => {
    let list = allTransactions;
    if (filterCategoryId) {
      list = list.filter((t) => t.categoryId === filterCategoryId);
    }
    if (filterWalletId) {
      list = list.filter((t) => t.walletId === filterWalletId);
    }
    return list;
  }, [allTransactions, filterCategoryId, filterWalletId]);

  const filterWalletLabel = useMemo(() => {
    if (!filterWalletId) {return null;}
    return wallets.find((w) => w.id === filterWalletId)?.name ?? 'Wallet';
  }, [filterWalletId, wallets]);

  const categoryById = useMemo(() => {
    const map = new Map<string, {name: string; icon: string; color: string}>();
    for (const c of categories) {
      map.set(c.id, {name: c.name, icon: c.icon, color: c.color});
    }
    return map;
  }, [categories]);

  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const openAdd = useCallback(() => {
    navigation.navigate('AddTransaction', {});
  }, [navigation]);

  const openSearch = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const handleTemplate = useCallback(
    (tpl: TransactionTemplate) => {
      const applied = applyTemplate(tpl);
      navigation.navigate(
        'AddTransaction',
        buildAddTransactionParamsFromApplied(applied),
      );
    },
    [navigation],
  );

  const openDetail = useCallback(
    (id: string) => {
      navigation.navigate('HomeTab', {
        screen: 'TransactionDetail',
        params: {transactionId: id},
      });
    },
    [navigation],
  );

  const openEdit = useCallback(
    (id: string) => {
      navigation.navigate('EditTransaction', {transactionId: id});
    },
    [navigation],
  );

  const confirmDelete = useCallback(
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
              deleteTransaction(id).catch((e) => {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete the transaction.');
              });
            },
          },
        ],
      );
    },
    [deleteTransaction],
  );

  const renderSectionHeader = useCallback(
    ({section}: {section: {title: string}}) => (
      <View style={[styles.sectionHeaderHost, {backgroundColor: colors.background}]}>
        <SectionHeader title={section.title} />
      </View>
    ),
    [colors.background],
  );

  const renderItem = useCallback(
    ({item}: {item: Transaction}) => {
      const cat = categoryById.get(item.categoryId) ?? UNKNOWN_CATEGORY;
      return (
        <View style={{paddingHorizontal: spacing.base, paddingBottom: spacing.sm}}>
          <TransactionCard
            amount={item.amount}
            categoryColor={cat.color}
            categoryIcon={cat.icon}
            categoryName={cat.name}
            currency={item.currency}
            description={item.description}
            id={item.id}
            merchant={item.merchant}
            notes={item.notes}
            source={item.source}
            transactionDate={item.transactionDate}
            type={item.type}
            hideAmounts={hideAmounts}
            selectable={isSelecting}
            selected={selectedIds.includes(item.id)}
            onToggleSelected={toggleSelected}
            onDelete={confirmDelete}
            onEdit={openEdit}
            onLongPress={toggleSelected}
            onPress={openDetail}
          />
        </View>
      );
    },
    [categoryById, confirmDelete, hideAmounts, isSelecting, openDetail, openEdit, selectedIds, spacing.base, spacing.sm, toggleSelected],
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const listEmpty = useMemo(
    () => (
      <EmptyState
        actionLabel="Add your first transaction"
        message="Transactions you add or capture from notifications will show up here."
        onAction={openAdd}
        title="No transactions yet"
      />
    ),
    [openAdd],
  );

  const setTabFilter = useCallback((next: TransactionTypeFilter) => {
    setTypeFilter(next);
  }, [setTypeFilter]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }, [refetch]);

  const showInitialLoading = isLoading && transactions.length === 0;
  const showFatalError = Boolean(error) && !isLoading && transactions.length === 0;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.headerBlock, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <View style={styles.headerRow}>
            <Text style={[typography.title2, {color: colors.text}]}>Transactions</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search transactions"
              onPress={openSearch}
              style={({pressed}) => [
                styles.searchBtn,
                {backgroundColor: colors.surfaceElevated, borderRadius: radius.full, opacity: pressed ? 0.7 : 1},
              ]}
            >
              <AppIcon name="magnify" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.filterRow}
            showsHorizontalScrollIndicator={false}>
            <Chip
              label="All"
              onPress={() => setTabFilter('all')}
              selected={typeFilter === 'all'}
            />
            <Chip
              label="Expenses"
              onPress={() => setTabFilter('expense')}
              selected={typeFilter === 'expense'}
            />
            <Chip
              label="Income"
              onPress={() => setTabFilter('income')}
              selected={typeFilter === 'income'}
            />
            <Chip
              label="Transfers"
              onPress={() => setTabFilter('transfer')}
              selected={typeFilter === 'transfer'}
            />
          </ScrollView>
          {filterCategoryId ? (
            <View style={[styles.filterBanner, {backgroundColor: `${colors.primary}12`, borderRadius: radius.md, marginHorizontal: spacing.base, marginTop: spacing.xs, padding: spacing.sm}]}>
              <Text style={{color: colors.primary, fontSize: 13, flex: 1}} numberOfLines={1}>
                Filtered: {categoryById.get(filterCategoryId)?.name ?? filterCategoryId}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear category filter"
                hitSlop={8}
                onPress={() => navigation.setParams({filterCategoryId: undefined})}>
                <Text style={{color: colors.primary, fontSize: 13, fontWeight: '600'}}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
          {filterWalletId ? (
            <View style={[styles.filterBanner, {backgroundColor: `${colors.primary}12`, borderRadius: radius.md, marginHorizontal: spacing.base, marginTop: spacing.xs, padding: spacing.sm}]}>
              <Text style={{color: colors.primary, fontSize: 13, flex: 1}} numberOfLines={1}>
                Wallet: {filterWalletLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear wallet filter"
                hitSlop={8}
                onPress={() => navigation.setParams({filterWalletId: undefined})}>
                <Text style={{color: colors.primary, fontSize: 13, fontWeight: '600'}}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {showFatalError ? (
          <View style={styles.errorWrap}>
            <ErrorState message={error ?? 'Unknown error'} onRetry={refetch} />
          </View>
        ) : showInitialLoading ? (
          <View
            style={[
              styles.skeletonBlock,
              {paddingHorizontal: spacing.base, paddingTop: spacing.sm},
            ]}>
            <Skeleton width="100%" height={72} borderRadius={radius.md} />
            <View style={{height: spacing.sm}} />
            <Skeleton width="100%" height={72} borderRadius={radius.md} />
            <View style={{height: spacing.sm}} />
            <Skeleton width="100%" height={72} borderRadius={radius.md} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: insets.bottom + 88,
            }}
            ListEmptyComponent={listEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenContainer>

      {!isSelecting ? (
        <QuickActionsFAB
          onSelectTemplate={handleTemplate}
          onAddManual={openAdd}
        />
      ) : null}
      <TransactionBulkActionsHost
        visibleIds={transactions.map((transaction) => transaction.id)}
        categories={categories}
        onComplete={refetch}
        bottomOffset={insets.bottom + 16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBlock: {
    gap: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  sectionHeaderHost: {
    paddingTop: 4,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  skeletonBlock: {
    flex: 1,
  },
});
