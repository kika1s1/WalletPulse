import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
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
import {useSubscriptionActions, useSubscriptions} from '@presentation/hooks/useSubscriptions';
import {useCategories} from '@presentation/hooks/useCategories';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useStableNow} from '@presentation/hooks/useStableNow';
import {SwipeableRow, type SwipeAction} from '@presentation/components/common/SwipeableRow';

const DAY = 86400000;

function formatDueInLabel(ms: number, now: number): string {
  const days = Math.ceil((ms - now) / DAY);
  if (days <= 0) {return 'Due today';}
  if (days === 1) {return 'Tomorrow';}
  return `In ${days}d`;
}

type Tab = 'active' | 'cancelled';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SubscriptionsList'>;

type SubCardItemProps = {
  sub: Subscription;
  now: number;
  hide: boolean;
  categoryLabel: string;
  onEdit: (id: string) => void;
  onCancel: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
};

const SubCardItem = React.memo(function SubCardItem({
  sub,
  now,
  hide,
  categoryLabel,
  onEdit,
  onCancel,
  onDelete,
}: SubCardItemProps) {
  const {colors, radius, shadows} = useTheme();

  const rightActions = useMemo((): SwipeAction[] => {
    const actions: SwipeAction[] = [
      {label: 'Edit', color: colors.primary, onPress: () => onEdit(sub.id)},
    ];
    if (sub.isActive) {
      actions.push({label: 'Cancel', color: colors.warning, onPress: () => onCancel(sub)});
    }
    actions.push({label: 'Delete', color: colors.danger, onPress: () => onDelete(sub)});
    return actions;
  }, [sub, colors.primary, colors.warning, colors.danger, onEdit, onCancel, onDelete]);

  return (
    <SwipeableRow rightActions={rightActions}>
      <Pressable
        accessibilityLabel={`Edit ${sub.name}`}
        accessibilityRole="button"
        onPress={() => onEdit(sub.id)}
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
            <Text numberOfLines={1} style={[styles.subName, {color: colors.text}]}>{sub.name}</Text>
            <Text style={[styles.subCycle, {color: colors.textTertiary}]}>
              {sub.billingCycle} / {categoryLabel}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={[styles.subAmount, {color: sub.isActive ? colors.text : colors.textTertiary}]}>
              {formatAmountMasked(sub.amount, sub.currency, hide)}
            </Text>
            {sub.isActive ? (
              <Text style={[styles.subDue, {color: colors.textSecondary}]}>
                {formatDueInLabel(sub.nextDueDate, now)}
              </Text>
            ) : (
              <View style={[styles.cancelledBadge, {backgroundColor: colors.danger + '15', borderRadius: radius.xs}]}>
                <Text style={[styles.cancelledText, {color: colors.danger}]}>Cancelled</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </SwipeableRow>
  );
});

export default function SubscriptionsListScreen() {
  const navigation = useNavigation<Nav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const [tab, setTab] = useState<Tab>('active');
  const {subscriptions, isLoading, error} = useSubscriptions();
  const {cancelSubscription, deleteSubscription} = useSubscriptionActions();
  const {categories} = useCategories();
  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {m.set(c.id, c.name);}
    return m;
  }, [categories]);
  const hide = useSettingsStore((s) => s.hideAmounts);
  const now = useStableNow();

  const groups = useMemo(() => groupSubscriptionsByStatus(subscriptions), [subscriptions]);
  const monthlyCost = useMemo(() => calculateTotalMonthlyCost(subscriptions), [subscriptions]);
  const yearlyCost = useMemo(() => calculateTotalYearlyCost(subscriptions), [subscriptions]);
  const upcoming = useMemo(() => getUpcomingRenewals(subscriptions, now, 7), [subscriptions, now]);
  const breakdown = useMemo(() => getCostBreakdownByCategory(subscriptions), [subscriptions]);

  const displayed = useMemo(() => {
    const list = tab === 'active' ? groups.active : groups.cancelled;
    return sortSubscriptionsByNextDue(list);
  }, [tab, groups]);

  const confirmDeleteSubscription = useCallback(
    (sub: Subscription) => {
      Alert.alert('Delete subscription', `Remove "${sub.name}"? This cannot be undone.`, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteSubscription(sub.id).catch((e) =>
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete'),
            );
          },
        },
      ]);
    },
    [deleteSubscription],
  );

  const handleCancelSubscription = useCallback(
    (sub: Subscription) => {
      void cancelSubscription(sub.id).catch((e) =>
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel'),
      );
    },
    [cancelSubscription],
  );

  const navigateToEditSub = useCallback(
    (id: string) => navigation.navigate('CreateSubscription', {editSubscriptionId: id}),
    [navigation],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <BackButton />
          <Text style={[typography.title3, {color: colors.text}]}>Subscriptions</Text>
          <Pressable
            accessibilityLabel="Add subscription"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.navigate('CreateSubscription')}>
            <Text style={[styles.addBtn, {color: colors.primary}]}>+ Add</Text>
          </Pressable>
        </View>

        {isLoading && subscriptions.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && subscriptions.length === 0 ? (
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
            {subscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <AppIcon name="credit-card-refresh-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, {color: colors.text}]}>No subscriptions yet</Text>
                <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
                  Track recurring payments like Netflix, Spotify, and more.
                </Text>
              </View>
            ) : (
              <>
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={[styles.costCard, {backgroundColor: colors.primary, borderRadius: radius.lg}, shadows.md]}
                >
                  <View style={styles.costRow}>
                    <View style={{flex: 1}}>
                      <Text style={styles.costLabel}>Monthly</Text>
                      <Text style={styles.costValue}>{formatAmountMasked(Math.round(monthlyCost), baseCurrency, hide)}</Text>
                    </View>
                    <View style={[styles.costDivider, {backgroundColor: '#FFFFFF30'}]} />
                    <View style={{flex: 1, alignItems: 'flex-end'}}>
                      <Text style={styles.costLabel}>Yearly</Text>
                      <Text style={styles.costValue}>{formatAmountMasked(yearlyCost, baseCurrency, hide)}</Text>
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
                          {formatAmountMasked(b.monthlyTotal, baseCurrency, hide)}/mo
                        </Text>
                        <Text style={[styles.breakdownCount, {color: colors.textTertiary}]}>
                          ({b.count})
                        </Text>
                      </View>
                    ))}
                  </Animated.View>
                )}

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

                {displayed.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyDesc, {color: colors.textTertiary}]}>
                      {tab === 'cancelled' ? 'No cancelled subscriptions.' : 'No active subscriptions yet.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{gap: 10}}>
                    {displayed.map((sub) => (
                      <SubCardItem
                        key={sub.id}
                        sub={sub}
                        now={now}
                        hide={hide}
                        categoryLabel={categoryMap.get(sub.categoryId) ?? sub.categoryId}
                        onEdit={navigateToEditSub}
                        onCancel={handleCancelSubscription}
                        onDelete={confirmDeleteSubscription}
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
  emptyState: {alignItems: 'center', paddingVertical: 60, gap: 12},
  emptyTitle: {fontSize: 17, fontWeight: fontWeight.semibold},
  emptyDesc: {fontSize: 13, textAlign: 'center'},
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
  subName: {fontSize: 15, fontWeight: fontWeight.semibold},
  subCycle: {fontSize: 12, marginTop: 1},
  subAmount: {fontSize: 15, fontWeight: '700'},
  subDue: {fontSize: 11, marginTop: 2},
  cancelledBadge: {paddingHorizontal: 6, paddingVertical: 2, marginTop: 2},
  cancelledText: {fontSize: 10, fontWeight: fontWeight.semibold},
  addBtn: {fontSize: 15, fontWeight: fontWeight.semibold},
});
