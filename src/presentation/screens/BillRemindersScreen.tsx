import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmount} from '@shared/utils/format-currency';
import {
  getUpcomingBills,
  getOverdueBills,
  calculateMonthlyBillTotal,
} from '@domain/usecases/bill-reminder-management';
import type {BillReminder} from '@domain/entities/BillReminder';

const DAY = 86400000;
const now = Date.now();

const MOCK_BILLS: BillReminder[] = [
  {
    id: 'bill-1',
    name: 'Electricity',
    amount: 15000,
    currency: 'USD',
    dueDate: now + 3 * DAY,
    recurrence: 'monthly',
    categoryId: 'utilities',
    isPaid: false,
    remindDaysBefore: 3,
    createdAt: now - 60 * DAY,
    updatedAt: now,
  },
  {
    id: 'bill-2',
    name: 'Internet',
    amount: 7999,
    currency: 'USD',
    dueDate: now + 10 * DAY,
    recurrence: 'monthly',
    categoryId: 'utilities',
    isPaid: false,
    remindDaysBefore: 2,
    createdAt: now - 45 * DAY,
    updatedAt: now,
  },
  {
    id: 'bill-3',
    name: 'Rent',
    amount: 120000,
    currency: 'USD',
    dueDate: now - 2 * DAY,
    recurrence: 'monthly',
    categoryId: 'housing',
    isPaid: false,
    remindDaysBefore: 5,
    createdAt: now - 90 * DAY,
    updatedAt: now,
  },
  {
    id: 'bill-4',
    name: 'Insurance',
    amount: 35000,
    currency: 'USD',
    dueDate: now + 15 * DAY,
    recurrence: 'quarterly',
    categoryId: 'insurance',
    isPaid: false,
    remindDaysBefore: 7,
    createdAt: now - 30 * DAY,
    updatedAt: now,
  },
  {
    id: 'bill-5',
    name: 'Gym Membership',
    amount: 4999,
    currency: 'USD',
    dueDate: now - 5 * DAY,
    recurrence: 'monthly',
    categoryId: 'health',
    isPaid: true,
    paidTransactionId: 'txn-99',
    remindDaysBefore: 1,
    createdAt: now - 60 * DAY,
    updatedAt: now,
  },
];

type Tab = 'upcoming' | 'overdue' | 'all';

export default function BillRemindersScreen() {
  const navigation = useNavigation();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('upcoming');

  const upcoming = useMemo(() => getUpcomingBills(MOCK_BILLS, now, 30), []);
  const overdue = useMemo(() => getOverdueBills(MOCK_BILLS, now), []);
  const monthlyTotal = useMemo(
    () => calculateMonthlyBillTotal(MOCK_BILLS),
    [],
  );

  const displayed = useMemo(() => {
    if (tab === 'upcoming') return upcoming;
    if (tab === 'overdue') return overdue;
    return MOCK_BILLS;
  }, [tab, upcoming, overdue]);

  function formatDueDate(ms: number): string {
    const diff = ms - now;
    const days = Math.ceil(diff / DAY);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days}d`;
  }

  function renderBillCard(bill: BillReminder, index: number) {
    const isOverdueItem = !bill.isPaid && bill.dueDate < now;
    const dueBadgeColor = isOverdueItem
      ? colors.danger
      : bill.isPaid
        ? colors.success
        : colors.warning;

    return (
      <Animated.View
        key={bill.id}
        entering={FadeInDown.delay(index * 60).duration(250)}
        style={[
          styles.billCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.lg,
            borderColor: isOverdueItem ? colors.danger + '40' : colors.border,
            borderLeftColor: isOverdueItem ? colors.danger : colors.primary,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.billHeader}>
          <View style={{flex: 1}}>
            <Text style={[styles.billName, {color: colors.text}]}>{bill.name}</Text>
            <Text style={[styles.billCategory, {color: colors.textTertiary}]}>
              {bill.categoryId} / {bill.recurrence}
            </Text>
          </View>
          <Text style={[styles.billAmount, {color: colors.text}]}>
            {formatAmount(bill.amount, bill.currency)}
          </Text>
        </View>

        <View style={styles.billFooter}>
          <View
            style={[
              styles.dueBadge,
              {backgroundColor: dueBadgeColor + '18', borderRadius: radius.sm},
            ]}
          >
            <Text style={[styles.dueBadgeText, {color: dueBadgeColor}]}>
              {bill.isPaid ? 'Paid' : formatDueDate(bill.dueDate)}
            </Text>
          </View>
          {bill.remindDaysBefore > 0 && !bill.isPaid && (
            <Text style={[styles.remindText, {color: colors.textTertiary}]}>
              Remind {bill.remindDaysBefore}d before
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }

  const tabs: {key: Tab; label: string; count: number}[] = [
    {key: 'upcoming', label: 'Upcoming', count: upcoming.length},
    {key: 'overdue', label: 'Overdue', count: overdue.length},
    {key: 'all', label: 'All', count: MOCK_BILLS.length},
  ];

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={[styles.backBtn, {color: colors.primary}]}>Back</Text>
          </Pressable>
          <Text style={[typography.title3, {color: colors.text}]}>Bill Reminders</Text>
          <View style={{width: 48}} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.summaryCard,
              {backgroundColor: colors.primary, borderRadius: radius.lg},
              shadows.md,
            ]}
          >
            <Text style={styles.summaryLabel}>Estimated Monthly Bills</Text>
            <Text style={styles.summaryAmount}>
              {formatAmount(monthlyTotal, 'USD')}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>{upcoming.length}</Text>
                <Text style={styles.summaryItemLabel}>Upcoming</Text>
              </View>
              <View style={[styles.summaryDivider, {backgroundColor: '#FFFFFF30'}]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemValue, {color: overdue.length > 0 ? '#FFB74D' : '#FFFFFF'}]}>
                  {overdue.length}
                </Text>
                <Text style={styles.summaryItemLabel}>Overdue</Text>
              </View>
              <View style={[styles.summaryDivider, {backgroundColor: '#FFFFFF30'}]} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemValue}>
                  {MOCK_BILLS.filter((b) => b.isPaid).length}
                </Text>
                <Text style={styles.summaryItemLabel}>Paid</Text>
              </View>
            </View>
          </Animated.View>

          {/* Tabs */}
          <View style={[styles.tabRow, {backgroundColor: colors.surface, borderRadius: radius.md}]}>
            {tabs.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{selected: tab === t.key}}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabItem,
                  tab === t.key && {backgroundColor: colors.surfaceElevated, borderRadius: radius.sm},
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {color: tab === t.key ? colors.primary : colors.textSecondary},
                  ]}
                >
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {backgroundColor: t.key === 'overdue' && t.count > 0 ? colors.danger : colors.primary},
                    ]}
                  >
                    <Text style={styles.tabBadgeText}>{t.count}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Bills list */}
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, {color: colors.textTertiary}]}>
                {tab === 'overdue' ? 'All caught up!' : 'No bills yet'}
              </Text>
              <Text style={[styles.emptyText, {color: colors.textTertiary}]}>
                {tab === 'overdue'
                  ? 'You have no overdue bills.'
                  : 'Add your recurring bills to track due dates.'}
              </Text>
            </View>
          ) : (
            <View style={{gap: 10}}>
              {displayed.map((bill, idx) => renderBillCard(bill, idx))}
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  backBtn: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    minWidth: 48,
  },
  scrollContent: {gap: 16, paddingTop: 12},
  summaryCard: {padding: 20, gap: 12},
  summaryLabel: {color: '#FFFFFFCC', fontSize: 13, fontWeight: fontWeight.medium},
  summaryAmount: {color: '#FFFFFF', fontSize: 28, fontWeight: '700'},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8},
  summaryItem: {alignItems: 'center', gap: 2},
  summaryItemValue: {color: '#FFFFFF', fontSize: 20, fontWeight: '700'},
  summaryItemLabel: {color: '#FFFFFFAA', fontSize: 11},
  summaryDivider: {width: 1, height: 32},
  tabRow: {flexDirection: 'row', padding: 4},
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tabLabel: {fontSize: 13, fontWeight: fontWeight.semibold},
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {color: '#FFFFFF', fontSize: 10, fontWeight: '700'},
  billCard: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    gap: 10,
  },
  billHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  billName: {fontSize: 15, fontWeight: fontWeight.semibold},
  billCategory: {fontSize: 12, marginTop: 2},
  billAmount: {fontSize: 16, fontWeight: '700'},
  billFooter: {flexDirection: 'row', alignItems: 'center', gap: 10},
  dueBadge: {paddingHorizontal: 8, paddingVertical: 3},
  dueBadgeText: {fontSize: 11, fontWeight: fontWeight.semibold},
  remindText: {fontSize: 11},
  emptyState: {alignItems: 'center', paddingVertical: 40, gap: 8},
  emptyIcon: {fontSize: 18, fontWeight: fontWeight.semibold},
  emptyText: {fontSize: 13},
});
