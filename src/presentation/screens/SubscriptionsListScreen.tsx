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
  groupSubscriptionsByStatus,
  calculateTotalMonthlyCost,
  calculateTotalYearlyCost,
  getUpcomingRenewals,
  sortSubscriptionsByNextDue,
  getCostBreakdownByCategory,
} from '@domain/usecases/subscription-management';
import type {Subscription} from '@domain/entities/Subscription';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

const DAY = 86400000;
const now = Date.now();

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-1',
    name: 'Netflix',
    amount: 1599,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 8 * DAY,
    categoryId: 'entertainment',
    isActive: true,
    icon: 'netflix',
    color: '#E50914',
    createdAt: now - 365 * DAY,
    updatedAt: now,
  },
  {
    id: 'sub-2',
    name: 'Spotify',
    amount: 999,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 15 * DAY,
    categoryId: 'entertainment',
    isActive: true,
    icon: 'spotify',
    color: '#1DB954',
    createdAt: now - 200 * DAY,
    updatedAt: now,
  },
  {
    id: 'sub-3',
    name: 'GitHub Pro',
    amount: 400,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 20 * DAY,
    categoryId: 'productivity',
    isActive: true,
    icon: 'github',
    color: '#24292F',
    createdAt: now - 180 * DAY,
    updatedAt: now,
  },
  {
    id: 'sub-4',
    name: 'iCloud 200GB',
    amount: 299,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 5 * DAY,
    categoryId: 'cloud',
    isActive: true,
    icon: 'cloud',
    color: '#007AFF',
    createdAt: now - 300 * DAY,
    updatedAt: now,
  },
  {
    id: 'sub-5',
    name: 'Adobe CC',
    amount: 5499,
    currency: 'USD',
    billingCycle: 'monthly',
    nextDueDate: now + 12 * DAY,
    categoryId: 'productivity',
    isActive: false,
    cancelledAt: now - 30 * DAY,
    icon: 'adobe',
    color: '#FF0000',
    createdAt: now - 400 * DAY,
    updatedAt: now - 30 * DAY,
  },
];

type Tab = 'active' | 'cancelled';

export default function SubscriptionsListScreen() {
  const navigation = useNavigation();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('active');

  const groups = useMemo(() => groupSubscriptionsByStatus(MOCK_SUBSCRIPTIONS), []);
  const monthlyCost = useMemo(() => calculateTotalMonthlyCost(MOCK_SUBSCRIPTIONS), []);
  const yearlyCost = useMemo(() => calculateTotalYearlyCost(MOCK_SUBSCRIPTIONS), []);
  const upcoming = useMemo(() => getUpcomingRenewals(MOCK_SUBSCRIPTIONS, now, 7), []);
  const breakdown = useMemo(() => getCostBreakdownByCategory(MOCK_SUBSCRIPTIONS), []);

  const displayed = useMemo(() => {
    const list = tab === 'active' ? groups.active : groups.cancelled;
    return sortSubscriptionsByNextDue(list);
  }, [tab, groups]);

  function formatDueIn(ms: number): string {
    const days = Math.ceil((ms - now) / DAY);
    if (days <= 0) return 'Due today';
    if (days === 1) return 'Tomorrow';
    return `In ${days}d`;
  }

  function renderSubCard(sub: Subscription, index: number) {
    return (
      <Animated.View
        key={sub.id}
        entering={FadeInDown.delay(index * 60).duration(250)}
        style={[
          styles.subCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.lg,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.subRow}>
          <View style={[styles.subIconWrap, {backgroundColor: sub.color + '18', borderRadius: radius.md}]}>
            <AppIcon name={resolveIconName(sub.icon)} size={22} color={sub.color} />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.subName, {color: colors.text}]}>{sub.name}</Text>
            <Text style={[styles.subCycle, {color: colors.textTertiary}]}>
              {sub.billingCycle} / {sub.categoryId}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={[styles.subAmount, {color: sub.isActive ? colors.text : colors.textTertiary}]}>
              {formatAmount(sub.amount, sub.currency)}
            </Text>
            {sub.isActive ? (
              <Text style={[styles.subDue, {color: colors.textSecondary}]}>
                {formatDueIn(sub.nextDueDate)}
              </Text>
            ) : (
              <View style={[styles.cancelledBadge, {backgroundColor: colors.danger + '15', borderRadius: radius.xs}]}>
                <Text style={[styles.cancelledText, {color: colors.danger}]}>Cancelled</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={[styles.backBtn, {color: colors.primary}]}>Back</Text>
          </Pressable>
          <Text style={[typography.title3, {color: colors.text}]}>Subscriptions</Text>
          <View style={{width: 48}} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cost overview */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.costCard, {backgroundColor: colors.primary, borderRadius: radius.lg}, shadows.md]}
          >
            <View style={styles.costRow}>
              <View style={{flex: 1}}>
                <Text style={styles.costLabel}>Monthly</Text>
                <Text style={styles.costValue}>{formatAmount(Math.round(monthlyCost), 'USD')}</Text>
              </View>
              <View style={[styles.costDivider, {backgroundColor: '#FFFFFF30'}]} />
              <View style={{flex: 1, alignItems: 'flex-end'}}>
                <Text style={styles.costLabel}>Yearly</Text>
                <Text style={styles.costValue}>{formatAmount(yearlyCost, 'USD')}</Text>
              </View>
            </View>
            <View style={styles.costStats}>
              <Text style={styles.costStat}>
                {groups.active.length} active
              </Text>
              <Text style={styles.costStat}>
                {upcoming.length} renewing this week
              </Text>
            </View>
          </Animated.View>

          {/* Category breakdown */}
          {breakdown.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(100).duration(250)}
              style={[
                styles.breakdownCard,
                {backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, borderColor: colors.border},
                shadows.sm,
              ]}
            >
              <Text style={[styles.breakdownTitle, {color: colors.text}]}>Cost by Category</Text>
              {breakdown.map((b) => (
                <View key={b.categoryId} style={styles.breakdownRow}>
                  <Text style={[styles.breakdownCategory, {color: colors.textSecondary}]}>
                    {b.categoryId}
                  </Text>
                  <Text style={[styles.breakdownValue, {color: colors.text}]}>
                    {formatAmount(b.monthlyTotal, 'USD')}/mo
                  </Text>
                  <Text style={[styles.breakdownCount, {color: colors.textTertiary}]}>
                    ({b.count})
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Tabs */}
          <View style={[styles.tabRow, {backgroundColor: colors.surface, borderRadius: radius.md}]}>
            {(['active', 'cancelled'] as Tab[]).map((t) => {
              const count = t === 'active' ? groups.active.length : groups.cancelled.length;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="tab"
                  accessibilityState={{selected: tab === t}}
                  onPress={() => setTab(t)}
                  style={[
                    styles.tabItem,
                    tab === t && {backgroundColor: colors.surfaceElevated, borderRadius: radius.sm},
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      {color: tab === t ? colors.primary : colors.textSecondary},
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* List */}
          {displayed.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, {color: colors.textTertiary}]}>
                {tab === 'cancelled' ? 'No cancelled subscriptions.' : 'No active subscriptions yet.'}
              </Text>
            </View>
          ) : (
            <View style={{gap: 10}}>
              {displayed.map((sub, idx) => renderSubCard(sub, idx))}
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
  costCard: {padding: 20, gap: 14},
  costRow: {flexDirection: 'row', alignItems: 'center'},
  costDivider: {width: 1, height: 40, marginHorizontal: 16},
  costLabel: {color: '#FFFFFFAA', fontSize: 12, fontWeight: fontWeight.medium},
  costValue: {color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 2},
  costStats: {flexDirection: 'row', gap: 16},
  costStat: {color: '#FFFFFFCC', fontSize: 12},
  breakdownCard: {padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10},
  breakdownTitle: {fontSize: 14, fontWeight: fontWeight.semibold},
  breakdownRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  breakdownCategory: {flex: 1, fontSize: 13, textTransform: 'capitalize'},
  breakdownValue: {fontSize: 13, fontWeight: fontWeight.semibold},
  breakdownCount: {fontSize: 11},
  tabRow: {flexDirection: 'row', padding: 4},
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabLabel: {fontSize: 13, fontWeight: fontWeight.semibold},
  subCard: {padding: 14, borderWidth: StyleSheet.hairlineWidth},
  subRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  subIconWrap: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  subIcon: {fontSize: 20},
  subName: {fontSize: 15, fontWeight: fontWeight.semibold},
  subCycle: {fontSize: 12, marginTop: 1},
  subAmount: {fontSize: 15, fontWeight: '700'},
  subDue: {fontSize: 11, marginTop: 2},
  cancelledBadge: {paddingHorizontal: 6, paddingVertical: 2, marginTop: 2},
  cancelledText: {fontSize: 10, fontWeight: fontWeight.semibold},
  emptyState: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 13},
});
