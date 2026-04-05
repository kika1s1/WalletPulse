import React, {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {ScreenContainer} from '@presentation/components/layout';
import {formatAmount} from '@shared/utils/format-currency';
import {getProgress} from '@domain/entities/Goal';
import {
  sortGoalsByPriority,
  calculateTotalProgress,
  formatDeadline,
  getGoalStatusLabel,
} from '@domain/usecases/goal-management';
import type {Goal} from '@domain/entities/Goal';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

const DAY = 86400000;
const now = Date.now();

const MOCK_GOALS: Goal[] = [
  {
    id: 'g1',
    name: 'Emergency Fund',
    targetAmount: 500000,
    currentAmount: 275000,
    currency: 'USD',
    deadline: now + 120 * DAY,
    icon: 'bank',
    color: '#4CAF50',
    category: 'emergency',
    isCompleted: false,
    createdAt: now - 60 * DAY,
    updatedAt: now,
  },
  {
    id: 'g2',
    name: 'Vacation to Japan',
    targetAmount: 350000,
    currentAmount: 150000,
    currency: 'USD',
    deadline: now + 200 * DAY,
    icon: 'airplane',
    color: '#2196F3',
    category: 'vacation',
    isCompleted: false,
    createdAt: now - 45 * DAY,
    updatedAt: now,
  },
  {
    id: 'g3',
    name: 'New Laptop',
    targetAmount: 200000,
    currentAmount: 200000,
    currency: 'USD',
    deadline: now + 30 * DAY,
    icon: 'laptop',
    color: '#9C27B0',
    category: 'purchase',
    isCompleted: true,
    completedAt: now - 5 * DAY,
    createdAt: now - 90 * DAY,
    updatedAt: now,
  },
  {
    id: 'g4',
    name: 'Investment Portfolio',
    targetAmount: 1000000,
    currentAmount: 320000,
    currency: 'USD',
    deadline: now + 365 * DAY,
    icon: 'investment',
    color: '#FF9800',
    category: 'investment',
    isCompleted: false,
    createdAt: now - 120 * DAY,
    updatedAt: now,
  },
];

export default function GoalsListScreen() {
  const navigation = useNavigation();
  const {colors, spacing, radius, typography, shadows} = useTheme();
  const insets = useSafeAreaInsets();

  const sorted = useMemo(() => sortGoalsByPriority(MOCK_GOALS, now), []);
  const totalProgress = useMemo(() => calculateTotalProgress(MOCK_GOALS), []);

  const totalSaved = useMemo(
    () => MOCK_GOALS.reduce((s, g) => s + g.currentAmount, 0),
    [],
  );
  const totalTarget = useMemo(
    () => MOCK_GOALS.reduce((s, g) => s + g.targetAmount, 0),
    [],
  );

  function renderGoalCard(goal: Goal, index: number) {
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
      <Animated.View
        key={goal.id}
        entering={FadeInDown.delay(index * 80).duration(250)}
        style={[
          styles.goalCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderRadius: radius.lg,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, {backgroundColor: goal.color + '18', borderRadius: radius.md}]}>
            <AppIcon name={resolveIconName(goal.icon)} size={22} color={goal.color} />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.goalName, {color: colors.text}]}>{goal.name}</Text>
            <Text style={[styles.goalCategory, {color: colors.textTertiary}]}>
              {goal.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '18', borderRadius: radius.sm}]}>
            <Text style={[styles.statusText, {color: statusColor}]}>{status}</Text>
          </View>
        </View>

        {/* Progress bar */}
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
              {formatAmount(goal.currentAmount, goal.currency)}
            </Text>
            <Text style={[styles.progressPct, {color: goal.color}]}>{pct}%</Text>
            <Text style={[styles.progressTarget, {color: colors.textTertiary}]}>
              of {formatAmount(goal.targetAmount, goal.currency)}
            </Text>
          </View>
        </View>

        {/* Deadline */}
        {!goal.isCompleted && (
          <Text style={[styles.deadlineText, {color: colors.textSecondary}]}>
            {formatDeadline(goal.deadline, now)}
          </Text>
        )}
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
          <Text style={[typography.title3, {color: colors.text}]}>Savings Goals</Text>
          <View style={{width: 48}} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingHorizontal: spacing.base, paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview card */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.overviewCard,
              {backgroundColor: colors.primary, borderRadius: radius.lg},
              shadows.md,
            ]}
          >
            <Text style={styles.overviewLabel}>Total Saved</Text>
            <Text style={styles.overviewAmount}>{formatAmount(totalSaved, 'USD')}</Text>
            <View style={[styles.overviewProgressTrack, {backgroundColor: '#FFFFFF30', borderRadius: 3}]}>
              <View
                style={[
                  styles.overviewProgressFill,
                  {
                    width: `${Math.round(totalProgress * 100)}%`,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewSub}>
                {Math.round(totalProgress * 100)}% of {formatAmount(totalTarget, 'USD')} target
              </Text>
              <Text style={styles.overviewSub}>
                {MOCK_GOALS.length} goal{MOCK_GOALS.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </Animated.View>

          {/* Goals list */}
          <View style={{gap: 12}}>
            {sorted.map((goal, idx) => renderGoalCard(goal, idx))}
          </View>
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
  overviewCard: {padding: 20, gap: 10},
  overviewLabel: {color: '#FFFFFFCC', fontSize: 13, fontWeight: fontWeight.medium},
  overviewAmount: {color: '#FFFFFF', fontSize: 28, fontWeight: '700'},
  overviewProgressTrack: {height: 6},
  overviewProgressFill: {height: 6},
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  overviewSub: {color: '#FFFFFFAA', fontSize: 12},
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
  goalIcon: {fontSize: 20},
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
});
