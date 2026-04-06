import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {
  getUpcomingBills,
  getOverdueBills,
  calculateMonthlyBillTotal,
} from '@domain/usecases/bill-reminder-management';
import type {BillReminder} from '@domain/entities/BillReminder';
import {useBillReminderActions, useBillReminders} from '@presentation/hooks/useBillReminders';
import {useAppStore} from '@presentation/stores/useAppStore';
import {SwipeableRow, type SwipeAction} from '@presentation/components/common/SwipeableRow';
import {Toast} from '@presentation/components/feedback/Toast';

const DAY = 86400000;

type Tab = 'upcoming' | 'overdue' | 'all';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'BillReminders'>;

export default function BillRemindersScreen() {
  const navigation = useNavigation<Nav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [tab, setTab] = useState<Tab>('upcoming');
  const {bills, isLoading, error} = useBillReminders();
  const {markPaid, deleteBill} = useBillReminderActions();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const now = Date.now();
  const [paidToastVisible, setPaidToastVisible] = useState(false);

  const upcoming = useMemo(() => getUpcomingBills(bills, now, 30), [bills, now]);
  const overdue = useMemo(() => getOverdueBills(bills, now), [bills, now]);
  const monthlyTotal = useMemo(() => calculateMonthlyBillTotal(bills), [bills]);

  const displayed = useMemo(() => {
    if (tab === 'upcoming') return upcoming;
    if (tab === 'overdue') return overdue;
    return bills;
  }, [tab, upcoming, overdue, bills]);

  function formatDueDate(ms: number): string {
    const diff = ms - now;
    const days = Math.ceil(diff / DAY);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days}d`;
  }

  const navigateToEdit = useCallback(
    (billId: string) => {
      navigation.navigate('CreateBillReminder', {editBillId: billId});
    },
    [navigation],
  );

  const confirmDelete = useCallback(
    (bill: BillReminder) => {
      Alert.alert(
        'Delete bill reminder',
        `Remove "${bill.name}"? This cannot be undone.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteBill(bill.id).catch((e) =>
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete'),
              );
            },
          },
        ],
      );
    },
    [deleteBill],
  );

  const handleMarkPaid = useCallback(
    async (billId: string) => {
      try {
        await markPaid(billId);
        setPaidToastVisible(true);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to mark as paid');
      }
    },
    [markPaid],
  );

  function billSwipeActions(bill: BillReminder): SwipeAction[] {
    const actions: SwipeAction[] = [];
    if (!bill.isPaid) {
      actions.push({
        label: 'Mark paid',
        color: colors.success,
        onPress: () => {
          void handleMarkPaid(bill.id);
        },
      });
    }
    actions.push({
      label: 'Edit',
      color: colors.primary,
      onPress: () => navigateToEdit(bill.id),
    });
    actions.push({
      label: 'Delete',
      color: colors.danger,
      onPress: () => confirmDelete(bill),
    });
    return actions;
  }

  function renderBillCard(bill: BillReminder, index: number) {
    const isOverdueItem = !bill.isPaid && bill.dueDate < now;
    const dueBadgeColor = isOverdueItem
      ? colors.danger
      : bill.isPaid
        ? colors.success
        : colors.warning;

    return (
      <SwipeableRow key={bill.id} rightActions={billSwipeActions(bill)}>
        <Animated.View
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
          <Pressable
            accessibilityLabel={`Edit ${bill.name}`}
            accessibilityRole="button"
            onPress={() => navigateToEdit(bill.id)}
            style={({pressed}) => ({opacity: pressed ? 0.92 : 1})}
          >
            <View style={styles.billHeader}>
              <View style={{flex: 1}}>
                <Text style={[styles.billName, {color: colors.text}]}>{bill.name}</Text>
                <Text style={[styles.billCategory, {color: colors.textTertiary}]}>
                  {bill.categoryId} / {bill.recurrence}
                </Text>
              </View>
              <Text style={[styles.billAmount, {color: colors.text}]}>
                {formatAmountMasked(bill.amount, bill.currency, hide)}
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
          </Pressable>
        </Animated.View>
      </SwipeableRow>
    );
  }

  const tabs: {key: Tab; label: string; count: number}[] = [
    {key: 'upcoming', label: 'Upcoming', count: upcoming.length},
    {key: 'overdue', label: 'Overdue', count: overdue.length},
    {key: 'all', label: 'All', count: bills.length},
  ];

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <Toast
        duration={2200}
        message="Marked as paid"
        onDismiss={() => setPaidToastVisible(false)}
        type="success"
        visible={paidToastVisible}
      />
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={[styles.backBtn, {color: colors.primary}]}>Back</Text>
          </Pressable>
          <Text style={[typography.title3, {color: colors.text}]}>Bill Reminders</Text>
          <Pressable
            accessibilityLabel="Add bill reminder"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.navigate('CreateBillReminder')}>
            <Text style={[styles.addBtn, {color: colors.primary}]}>+ Add</Text>
          </Pressable>
        </View>

        {isLoading && bills.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && bills.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{color: colors.danger}}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
            ]}
            showsVerticalScrollIndicator={false}
          >
            {bills.length === 0 ? (
              <View style={styles.emptyState}>
                <AppIcon name="bell-ring-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, {color: colors.text}]}>No bills yet</Text>
                <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
                  Add your recurring bills to track due dates and never miss a payment.
                </Text>
              </View>
            ) : (
              <>
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
                    {formatAmountMasked(monthlyTotal, baseCurrency, hide)}
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
                        {bills.filter((b) => b.isPaid).length}
                      </Text>
                      <Text style={styles.summaryItemLabel}>Paid</Text>
                    </View>
                  </View>
                </Animated.View>

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

                {displayed.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
                      {tab === 'overdue' ? 'All caught up!' : 'No bills yet'}
                    </Text>
                    <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
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
              </>
            )}
          </ScrollView>
        )}
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
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyState: {alignItems: 'center', paddingVertical: 60, gap: 12},
  emptyTitle: {fontSize: 17, fontWeight: fontWeight.semibold},
  emptyDesc: {fontSize: 13, textAlign: 'center'},
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
  addBtn: {fontSize: 15, fontWeight: fontWeight.semibold},
});
