import React, {useCallback, useMemo, useState} from 'react';
import {SectionList, StyleSheet, Text, View, ScrollView} from 'react-native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {ScreenContainer, SectionHeader} from '@presentation/components/layout';
import {EmptyState} from '@presentation/components/feedback';
import {FAB, Chip} from '@presentation/components/common';
import {TransactionCard} from '@presentation/components/TransactionCard';
import {toDateString, isToday} from '@shared/utils/date-helpers';
import type {Transaction} from '@domain/entities/Transaction';
import type {TabParamList, TransactionsStackParamList} from '@presentation/navigation/types';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';

const MS_PER_DAY = 86400000;

type TransactionsNav = CompositeNavigationProp<
  NativeStackNavigationProp<TransactionsStackParamList, 'TransactionsList'>,
  BottomTabNavigationProp<TabParamList>
>;

function categoryIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'category';
}

function getCategoryDisplay(categoryId: string): {name: string; icon: string; color: string} {
  const found = DEFAULT_CATEGORIES.find((c) => categoryIdFromName(c.name) === categoryId);
  if (found) {
    return {name: found.name, icon: found.icon, color: found.color};
  }
  return {name: 'Other', icon: '•', color: '#B2BEC3'};
}

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

const nowSeed = Date.now();

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'mock-1',
    walletId: 'wallet-default',
    categoryId: 'food-and-dining',
    amount: 1299,
    currency: 'USD',
    type: 'expense',
    description: 'Lunch meeting',
    merchant: 'Urban Kitchen',
    source: 'manual',
    sourceHash: '',
    tags: ['team', 'food'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: 'Client lunch',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 45 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-2',
    walletId: 'wallet-default',
    categoryId: 'transportation',
    amount: 1850,
    currency: 'USD',
    type: 'expense',
    description: 'Ride to airport',
    merchant: 'Metro Cars',
    source: 'grey',
    sourceHash: 'g1',
    tags: ['travel'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 0.95,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 3 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-3',
    walletId: 'wallet-default',
    categoryId: 'salary',
    amount: 450000,
    currency: 'USD',
    type: 'income',
    description: 'Salary deposit',
    merchant: 'Acme Payroll',
    source: 'payoneer',
    sourceHash: 'p1',
    tags: ['payroll'],
    receiptUri: '',
    isRecurring: true,
    recurrenceRule: 'MONTHLY',
    confidence: 1,
    notes: 'March cycle',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 5 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-4',
    walletId: 'wallet-default',
    categoryId: 'groceries',
    amount: 6725,
    currency: 'USD',
    type: 'expense',
    description: 'Weekly groceries',
    merchant: 'Fresh Market',
    source: 'manual',
    sourceHash: '',
    tags: ['home'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - MS_PER_DAY + 2 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-5',
    walletId: 'wallet-default',
    categoryId: 'entertainment',
    amount: 1499,
    currency: 'USD',
    type: 'expense',
    description: 'Streaming renewal',
    merchant: 'StreamBox',
    source: 'manual',
    sourceHash: '',
    tags: ['subs'],
    receiptUri: '',
    isRecurring: true,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - MS_PER_DAY + 8 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-6',
    walletId: 'wallet-default',
    categoryId: 'freelance-income',
    amount: 120000,
    currency: 'USD',
    type: 'income',
    description: 'Invoice #1042 paid',
    merchant: 'Northwind Studio',
    source: 'dukascopy',
    sourceHash: 'd1',
    tags: ['client-a'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: 'Logo refresh phase 1',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - MS_PER_DAY + 14 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-7',
    walletId: 'wallet-default',
    categoryId: 'transfer',
    amount: 25000,
    currency: 'USD',
    type: 'transfer',
    description: 'Wallet top up',
    merchant: 'Internal',
    source: 'manual',
    sourceHash: '',
    tags: [],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: 'From savings',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 3 * MS_PER_DAY + 10 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-8',
    walletId: 'wallet-default',
    categoryId: 'utilities',
    amount: 8900,
    currency: 'USD',
    type: 'expense',
    description: 'Electric bill',
    merchant: 'City Power',
    source: 'manual',
    sourceHash: '',
    tags: ['bills'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 3 * MS_PER_DAY + 16 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
  {
    id: 'mock-9',
    walletId: 'wallet-default',
    categoryId: 'shopping',
    amount: 4599,
    currency: 'USD',
    type: 'expense',
    description: 'Office chair pad',
    merchant: 'DeskPro',
    source: 'manual',
    sourceHash: '',
    tags: ['office'],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: nowSeed - 3 * MS_PER_DAY + 18 * 60 * 60 * 1000,
    createdAt: nowSeed,
    updatedAt: nowSeed,
  },
];

export function getMockTransactionById(id: string): Transaction | undefined {
  return MOCK_TRANSACTIONS.find((t) => t.id === id);
}

type FilterKey = 'all' | 'expense' | 'income' | 'transfer';

export default function TransactionsScreen() {
  const navigation = useNavigation<TransactionsNav>();
  const {colors, spacing, typography} = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return MOCK_TRANSACTIONS;
    }
    return MOCK_TRANSACTIONS.filter((t) => t.type === filter);
  }, [filter]);

  const sections = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  const openAdd = useCallback(() => {
    navigation.navigate('AddTransaction');
  }, [navigation]);

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
      const cat = getCategoryDisplay(item.categoryId);
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
            source={item.source}
            transactionDate={item.transactionDate}
            type={item.type}
            onDelete={() => {}}
            onEdit={openEdit}
            onPress={openDetail}
          />
        </View>
      );
    },
    [openDetail, openEdit, spacing.base, spacing.sm],
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

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.headerBlock, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <Text style={[typography.title2, {color: colors.text}]}>Transactions</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.filterRow}
            showsHorizontalScrollIndicator={false}>
            <Chip
              label="All"
              onPress={() => setFilter('all')}
              selected={filter === 'all'}
            />
            <Chip
              label="Expenses"
              onPress={() => setFilter('expense')}
              selected={filter === 'expense'}
            />
            <Chip
              label="Income"
              onPress={() => setFilter('income')}
              selected={filter === 'income'}
            />
            <Chip
              label="Transfers"
              onPress={() => setFilter('transfer')}
              selected={filter === 'transfer'}
            />
          </ScrollView>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 88,
          }}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
        />
      </ScreenContainer>

      <FAB onPress={openAdd} />
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
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  sectionHeaderHost: {
    paddingTop: 4,
  },
});
