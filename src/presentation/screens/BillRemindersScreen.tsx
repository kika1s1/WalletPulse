import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {ErrorState} from '@presentation/components/feedback/ErrorState';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
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
import {useCategories} from '@presentation/hooks/useCategories';
import {useWallets} from '@presentation/hooks/useWallets';
import {useStableNow} from '@presentation/hooks/useStableNow';
import {SwipeableRow, type SwipeAction} from '@presentation/components/common/SwipeableRow';
import {Toast} from '@presentation/components/feedback/Toast';

const DAY = 86400000;

function formatDueDateLabel(ms: number, now: number): string {
  const diff = ms - now;
  const days = Math.ceil(diff / DAY);
  if (days < 0) {return `${Math.abs(days)}d overdue`;}
  if (days === 0) {return 'Due today';}
  if (days === 1) {return 'Due tomorrow';}
  return `Due in ${days}d`;
}

type Tab = 'upcoming' | 'overdue' | 'all';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'BillReminders'>;

type BillCardItemProps = {
  bill: BillReminder;
  now: number;
  hide: boolean;
  highlighted: boolean;
  categoryLabel: string;
  walletLabel: string;
  onEdit: (id: string) => void;
  onDelete: (bill: BillReminder) => void;
  onMarkPaid: (id: string) => void;
};

const BillCardItem = React.memo(function BillCardItem({
  bill,
  now,
  hide,
  highlighted,
  categoryLabel,
  walletLabel,
  onEdit,
  onDelete,
  onMarkPaid,
}: BillCardItemProps) {
  const {colors, radius, shadows} = useTheme();
  const isOverdueItem = !bill.isPaid && bill.dueDate < now;
  const dueBadgeColor = isOverdueItem ? colors.danger : bill.isPaid ? colors.success : colors.warning;

  const rightActions = useMemo((): SwipeAction[] => {
    const actions: SwipeAction[] = [];
    if (!bill.isPaid) {
      actions.push({label: 'Mark paid', color: colors.success, onPress: () => onMarkPaid(bill.id)});
    }
    actions.push({label: 'Edit', color: colors.primary, onPress: () => onEdit(bill.id)});
    actions.push({label: 'Delete', color: colors.danger, onPress: () => onDelete(bill)});
    return actions;
  }, [bill, colors.success, colors.primary, colors.danger, onMarkPaid, onEdit, onDelete]);

  return (
    <SwipeableRow rightActions={rightActions}>
      <View
        style={[
          styles.billCard,
          {
            backgroundColor: highlighted ? colors.primary + '08' : colors.surfaceElevated,
            borderRadius: radius.lg,
            borderColor: highlighted ? colors.primary : isOverdueItem ? colors.danger + '40' : colors.border,
            borderLeftColor: isOverdueItem ? colors.danger : colors.primary,
          },
          shadows.sm,
        ]}
      >
        <Pressable
          accessibilityLabel={`Edit ${bill.name}`}
          accessibilityRole="button"
          onPress={() => onEdit(bill.id)}
          style={({pressed}) => ({opacity: pressed ? 0.92 : 1})}
        >
          <View style={styles.billHeader}>
            <View style={{flex: 1}}>
              <Text numberOfLines={1} style={[styles.billName, {color: colors.text}]}>{bill.name}</Text>
              <Text style={[styles.billCategory, {color: colors.textTertiary}]}>
                {categoryLabel} / {bill.recurrence}
                {bill.walletId ? ` / ${walletLabel}` : ''}
              </Text>
            </View>
            <Text style={[styles.billAmount, {color: colors.text}]}>
              {formatAmountMasked(bill.amount, bill.currency, hide)}
            </Text>
          </View>

          <View style={styles.billFooter}>
            <View style={[styles.dueBadge, {backgroundColor: dueBadgeColor + '18', borderRadius: radius.sm}]}>
              <Text style={[styles.dueBadgeText, {color: dueBadgeColor}]}>
                {bill.isPaid ? 'Paid' : formatDueDateLabel(bill.dueDate, now)}
              </Text>
            </View>
            {bill.remindDaysBefore > 0 && !bill.isPaid && (
              <Text style={[styles.remindText, {color: colors.textTertiary}]}>
                Remind {bill.remindDaysBefore}d before
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </SwipeableRow>
  );
});

export default function BillRemindersScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'BillReminders'>>();
  const highlightBillId = route.params?.highlightBillId ?? null;
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [tab, setTab] = useState<Tab>('upcoming');
  const {bills, isLoading, error, refetch} = useBillReminders();
  const {markPaid, deleteBill} = useBillReminderActions();
  const {categories} = useCategories();
  const {wallets} = useWallets();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);
  const walletMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of wallets) {
      map.set(w.id, w.name);
    }
    return map;
  }, [wallets]);
  const now = useStableNow();
  const [paidToastVisible, setPaidToastVisible] = useState(false);

  const upcoming = useMemo(() => getUpcomingBills(bills, now, 30), [bills, now]);
  const overdue = useMemo(() => getOverdueBills(bills, now), [bills, now]);
  const monthlyTotal = useMemo(() => calculateMonthlyBillTotal(bills), [bills]);

  const displayed = useMemo(() => {
    if (tab === 'upcoming') {return upcoming;}
    if (tab === 'overdue') {return overdue;}
    return bills;
  }, [tab, upcoming, overdue, bills]);


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

  const handleMarkPaidCb = useCallback(
    (billId: string) => { void handleMarkPaid(billId); },
    [handleMarkPaid],
  );

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
          <BackButton />
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
          <View style={[styles.skeletonWrap, {paddingHorizontal: spacing.base}]}>
            <Skeleton width="100%" height={130} borderRadius={radius.lg} />
            <View style={{height: 12}} />
            <Skeleton width="100%" height={48} borderRadius={radius.md} />
            <View style={{height: 12}} />
            <Skeleton width="100%" height={80} borderRadius={radius.lg} />
            <View style={{height: 8}} />
            <Skeleton width="100%" height={80} borderRadius={radius.lg} />
          </View>
        ) : error && bills.length === 0 ? (
          <View style={styles.centered}>
            <ErrorState message={error} onRetry={refetch} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && bills.length > 0}
                onRefresh={refetch}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {bills.length === 0 ? (
              <View style={styles.emptyState}>
                <AppIcon name="bell-ring-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, {color: colors.text}]}>No bills yet</Text>
                <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
                  Add your recurring bills to track due dates and never miss a payment.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add your first bill"
                  onPress={() => navigation.navigate('CreateBillReminder')}
                  style={({pressed}) => [
                    styles.emptyCta,
                    {backgroundColor: colors.primary, borderRadius: radius.md, opacity: pressed ? 0.85 : 1},
                  ]}>
                  <Text style={[styles.emptyCtaText, {color: colors.onPrimary}]}>Add a bill</Text>
                </Pressable>
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
                    {displayed.map((bill) => (
                    <BillCardItem
                      key={bill.id}
                      bill={bill}
                      now={now}
                      hide={hide}
                      highlighted={bill.id === highlightBillId}
                      categoryLabel={categoryMap.get(bill.categoryId) ?? bill.categoryId}
                      walletLabel={walletMap.get(bill.walletId) ?? 'Unknown wallet'}
                      onEdit={navigateToEdit}
                      onDelete={confirmDelete}
                      onMarkPaid={handleMarkPaidCb}
                    />
                  ))}
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
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  skeletonWrap: {paddingTop: 16, gap: 0},
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
  emptyCta: {paddingHorizontal: 24, paddingVertical: 12, marginTop: 4},
  emptyCtaText: {fontSize: 15, fontWeight: '600'},
});
