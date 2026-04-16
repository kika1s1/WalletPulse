import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {EmptyState} from '@presentation/components/feedback/EmptyState';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {getProgress} from '@domain/entities/Goal';
import {
  sortGoalsByPriority,
  calculateTotalProgress,
  formatDeadline,
  getGoalStatusLabel,
} from '@domain/usecases/goal-management';
import type {Goal} from '@domain/entities/Goal';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';
import {useGoals} from '@presentation/hooks/useGoals';
import {useAppStore} from '@presentation/stores/useAppStore';
import {useStableNow} from '@presentation/hooks/useStableNow';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'GoalsList'>;

export default function GoalsListScreen() {
  const navigation = useNavigation<Nav>();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const hide = useSettingsStore((s) => s.hideAmounts);
  const baseCurrency = useAppStore((s) => s.baseCurrency);
  const {goals, isLoading, error, refetch} = useGoals();
  const now = useStableNow();
  const [refreshing, setRefreshing] = useState(false);
  const wasRefreshingRef = useRef(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
  }, [refetch]);

  if (refreshing && isLoading) {
    wasRefreshingRef.current = true;
  }
  if (refreshing && !isLoading && wasRefreshingRef.current) {
    setRefreshing(false);
    wasRefreshingRef.current = false;
  }

  const sorted = useMemo(() => sortGoalsByPriority(goals, now), [goals, now]);
  const totalProgress = useMemo(() => calculateTotalProgress(goals), [goals]);

  const totalSaved = useMemo(
    () => goals.reduce((s, g) => s + g.currentAmount, 0),
    [goals],
  );
  const totalTarget = useMemo(
    () => goals.reduce((s, g) => s + g.targetAmount, 0),
    [goals],
  );

  const renderGoalCard = useCallback((goal: Goal) => {
    const progress = getProgress(goal);
    const pct = Math.round(progress * 100);
    const status = getGoalStatusLabel(goal, now);
    const statusColor =
      status === 'Completed'
        ? colors.success
        : status === 'Overdue'
          ? colors.danger
          : colors.primary;

    return (
      <View
        key={goal.id}>
        <Pressable
          accessibilityHint="Opens goal details"
          accessibilityRole="button"
          onPress={() => navigation.navigate('GoalDetail', {goalId: goal.id})}
          style={({pressed}) => [
            styles.goalCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.lg,
              borderColor: colors.border,
              opacity: pressed ? 0.92 : 1,
            },
            shadows.sm,
          ]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, {backgroundColor: goal.color + '18', borderRadius: radius.md}]}>
            <AppIcon name={resolveIconName(goal.icon)} size={22} color={goal.color} />
          </View>
          <View style={{flex: 1}}>
            <Text numberOfLines={1} style={[styles.goalName, {color: colors.text}]}>{goal.name}</Text>
            <Text style={[styles.goalCategory, {color: colors.textTertiary}]}>
              {goal.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '18', borderRadius: radius.sm}]}>
            <Text style={[styles.statusText, {color: statusColor}]}>{status}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, {backgroundColor: colors.border, borderRadius: radius.xs}]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: goal.color,
                  borderRadius: radius.xs,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressAmount, {color: colors.text}]}>
              {formatAmountMasked(goal.currentAmount, goal.currency, hide)}
            </Text>
            <Text style={[styles.progressPct, {color: goal.color}]}>{pct}%</Text>
            <Text style={[styles.progressTarget, {color: colors.textTertiary}]}>
              of {formatAmountMasked(goal.targetAmount, goal.currency, hide)}
            </Text>
          </View>
        </View>

        {!goal.isCompleted && (
          <Text style={[styles.deadlineText, {color: colors.textSecondary}]}>
            {formatDeadline(goal.deadline, now)}
          </Text>
        )}
        </Pressable>
      </View>
    );
  }, [colors, radius, shadows, hide, navigation, now]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer scrollable={false}>
        <View style={[styles.header, {paddingHorizontal: spacing.base, paddingTop: spacing.sm}]}>
          <BackButton />
          <Text style={[typography.title3, {color: colors.text}]}>Savings Goals</Text>
          <Pressable
            accessibilityLabel="Add goal"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.navigate('CreateGoal')}>
            <Text style={[styles.addBtn, {color: colors.primary}]}>+ Add</Text>
          </Pressable>
        </View>

        {isLoading && goals.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && goals.length === 0 ? (
          <View style={styles.centered}>
            <Text style={{color: colors.danger, marginBottom: spacing.sm}}>{error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={refetch}>
              <Text style={{color: colors.primary, fontWeight: '600'}}>Tap to retry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: spacing.base,
                paddingBottom: insets.bottom + 24,
                flexGrow: 1,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {goals.length === 0 ? (
              <EmptyState
                actionLabel="Add a goal"
                icon="flag-outline"
                message="Set savings goals to track your progress."
                title="No goals yet"
                onAction={() => navigation.navigate('CreateGoal')}
              />
            ) : (
              <>
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={[
                    styles.overviewCard,
                    {backgroundColor: colors.primary, borderRadius: radius.lg},
                    shadows.md,
                  ]}
                >
                  <Text style={[styles.overviewLabel, {color: `${colors.onPrimary}CC`}]}>Total Saved</Text>
                  <Text style={[styles.overviewAmount, {color: colors.onPrimary}]}>
                    {formatAmountMasked(totalSaved, baseCurrency, hide)}
                  </Text>
                  <View
                    style={[
                      styles.overviewProgressTrack,
                      {backgroundColor: `${colors.onPrimary}30`, borderRadius: 3},
                    ]}>
                    <View
                      style={[
                        styles.overviewProgressFill,
                        {
                          width: `${Math.round(totalProgress * 100)}%`,
                          backgroundColor: colors.onPrimary,
                          borderRadius: 3,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.overviewRow}>
                    <Text style={[styles.overviewSub, {color: `${colors.onPrimary}AA`}]}>
                      {Math.round(totalProgress * 100)}% of {formatAmountMasked(totalTarget, baseCurrency, hide)} target
                    </Text>
                    <Text style={[styles.overviewSub, {color: `${colors.onPrimary}AA`}]}>
                      {goals.length} goal{goals.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Animated.View>

                <View style={{gap: 12}}>
                  {sorted.map((goal) => renderGoalCard(goal))}
                </View>
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
  scrollContent: {gap: 16, paddingTop: 12},
  overviewCard: {padding: 20, gap: 10},
  overviewLabel: {fontSize: 13, fontWeight: fontWeight.medium},
  overviewAmount: {fontSize: 28, fontWeight: '700'},
  overviewProgressTrack: {height: 6},
  overviewProgressFill: {height: 6},
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  overviewSub: {fontSize: 12},
  goalCard: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {fontSize: 15, fontWeight: fontWeight.semibold},
  goalCategory: {fontSize: 12, textTransform: 'capitalize', marginTop: 1},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: fontWeight.semibold},
  progressSection: {gap: 6},
  progressTrack: {height: 6},
  progressFill: {height: 6},
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressAmount: {fontSize: 13, fontWeight: fontWeight.semibold},
  progressPct: {fontSize: 12, fontWeight: '700'},
  progressTarget: {fontSize: 12},
  deadlineText: {fontSize: 12},
  addBtn: {fontSize: 15, fontWeight: fontWeight.semibold},
});
