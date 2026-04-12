import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type {SettingsStackParamList} from '@presentation/navigation/types';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {BackButton} from '@presentation/components/common';
import {ScreenContainer} from '@presentation/components/layout';
import {ProgressBar} from '@presentation/components/common/ProgressBar';
import {Button} from '@presentation/components/common/Button';
import {AmountInput} from '@presentation/components/common/AmountInput';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';
import {formatAmountMasked} from '@shared/utils/format-currency';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {getProgress, getRemainingAmount} from '@domain/entities/Goal';
import {formatDeadline, getGoalStatusLabel} from '@domain/usecases/goal-management';
import {useGoals, useGoalActions} from '@presentation/hooks/useGoals';
import {useStableNow} from '@presentation/hooks/useStableNow';
import {calculatePercentage} from '@domain/value-objects/Percentage';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'GoalDetail'>;
type Route = RouteProp<SettingsStackParamList, 'GoalDetail'>;

function formatDeadlineDate(deadlineMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(deadlineMs));
}

export default function GoalDetailScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {goalId} = route.params;
  const hide = useSettingsStore((s) => s.hideAmounts);

  const {goals, isLoading} = useGoals();
  const {updateProgress, markCompleted, deleteGoal, isSubmitting} = useGoalActions();

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const now = useStableNow();

  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribCents, setContribCents] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const progressRatio = goal ? getProgress(goal) : 0;
  const pctRounded = Math.round(progressRatio * 100);
  const canMarkComplete = goal && !goal.isCompleted && progressRatio >= 1;

  const goalMetrics = useMemo(() => {
    if (!goal) {
      return {remaining: 0, etaDays: null as number | null, isOnTrack: false, percentage: 0};
    }
    const MS_PER_DAY = 86_400_000;
    const remaining = getRemainingAmount(goal);
    const pct = calculatePercentage(goal.currentAmount, goal.targetAmount);

    let etaDays: number | null = null;
    if (goal.currentAmount >= goal.targetAmount) {
      etaDays = 0;
    } else {
      const elapsedMs = now - goal.createdAt;
      const elapsedDays = Math.max(elapsedMs / MS_PER_DAY, 1);
      const ratePerDay = goal.currentAmount / elapsedDays;
      if (ratePerDay > 0) {
        etaDays = Math.ceil(remaining / ratePerDay);
      }
    }

    let isOnTrack = false;
    if (goal.currentAmount >= goal.targetAmount) {
      isOnTrack = now <= goal.deadline;
    } else if (etaDays !== null) {
      isOnTrack = now + etaDays * MS_PER_DAY <= goal.deadline;
    }

    return {remaining, etaDays, isOnTrack, percentage: pct.value};
  }, [goal, now]);

  const openContribModal = useCallback(() => {
    setContribCents(0);
    setContribModalOpen(true);
  }, []);

  const handleAddContribution = useCallback(async () => {
    if (!goal || contribCents <= 0 || isSubmitting) {
      return;
    }
    try {
      const next = goal.currentAmount + contribCents;
      await updateProgress(goal.id, next);
      setContribModalOpen(false);
      setContribCents(0);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update progress');
    }
  }, [contribCents, goal, isSubmitting, updateProgress]);

  const handleMarkComplete = useCallback(() => {
    if (!goal || isSubmitting) {
      return;
    }
    Alert.alert('Mark complete', 'Mark this goal as completed?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await markCompleted(goal.id);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete goal');
          }
        },
      },
    ]);
  }, [goal, isSubmitting, markCompleted]);

  const handleDelete = useCallback(() => {
    if (!goal) {
      return;
    }
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteGoal(goal.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete goal');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [deleteGoal, goal, navigation]);

  const handleEdit = useCallback(() => {
    if (!goal) {
      return;
    }
    navigation.navigate('CreateGoal', {editGoalId: goal.id});
  }, [goal, navigation]);

  if (isLoading && !goal) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <ScreenContainer scrollable={false}>
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </ScreenContainer>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <ScreenContainer scrollable={false}>
          <View style={[styles.header, {paddingHorizontal: spacing.base}]}>
            <BackButton />
          </View>
          <View style={styles.centered}>
            <Text style={{color: colors.textSecondary}}>Goal not found</Text>
            <View style={{marginTop: spacing.md, alignSelf: 'stretch'}}>
              <Button
                fullWidth
                onPress={() => navigation.goBack()}
                title="Go back"
                variant="outline"
              />
            </View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  const statusLabel = getGoalStatusLabel(goal, now);
  const statusColor =
    statusLabel === 'Completed'
      ? colors.success
      : statusLabel === 'Overdue'
        ? colors.danger
        : colors.primary;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <ScreenContainer>
        <View style={[styles.header, {paddingHorizontal: spacing.base}]}>
          <BackButton />
          <Text style={[styles.headerTitle, {color: colors.text}]} numberOfLines={1}>
            Goal
          </Text>
          <Pressable
            accessibilityLabel="Delete goal"
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleDelete}>
            <Text style={[styles.deleteHeaderBtn, {color: colors.danger}]}>
              {isDeleting ? '...' : 'Delete'}
            </Text>
          </Pressable>
        </View>

        <View style={{paddingHorizontal: spacing.base, gap: spacing.md, paddingBottom: spacing['3xl']}}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
              shadows.md,
            ]}>
            <View style={styles.heroTopRow}>
              <View
                style={[
                  styles.iconWrap,
                  {backgroundColor: goal.color + '22', borderRadius: radius.md},
                ]}>
                <AppIcon color={goal.color} name={resolveIconName(goal.icon)} size={28} />
              </View>
              <View style={{flex: 1}}>
                <Text numberOfLines={1} style={[styles.goalName, {color: colors.text}]}>{goal.name}</Text>
                <Text style={[styles.categoryLine, {color: colors.textTertiary}]}>
                  {goal.category}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  {backgroundColor: statusColor + '22', borderRadius: radius.sm},
                ]}>
                <Text style={[styles.statusPillText, {color: statusColor}]}>{statusLabel}</Text>
              </View>
            </View>

            <Text
              style={[
                styles.deadlineLine,
                {color: colors.textSecondary, marginTop: spacing.md},
              ]}>
              Deadline: {formatDeadlineDate(goal.deadline)}
            </Text>
            <Text style={[styles.deadlineSub, {color: colors.textTertiary}]}>
              {formatDeadline(goal.deadline, now)}
            </Text>

            <View style={{marginTop: spacing.lg, alignItems: 'center'}}>
              <Text style={[styles.savedLabel, {color: colors.textTertiary}]}>Saved</Text>
              <Text style={[styles.savedMajor, {color: goal.color}]}>
                {formatAmountMasked(goal.currentAmount, goal.currency, hide)}
              </Text>
              <Text style={[styles.ofLine, {color: colors.textSecondary}]}>
                of {formatAmountMasked(goal.targetAmount, goal.currency, hide)}
              </Text>
            </View>

            <View style={{marginTop: spacing.md}}>
              <ProgressBar
                color={goal.color}
                height={14}
                progress={Math.min(progressRatio, 1)}
              />
            </View>
            <Text
              style={[
                styles.pctLine,
                {color: colors.textSecondary, marginTop: spacing.sm},
              ]}>
              {pctRounded}% complete
            </Text>

            <View style={[styles.metricsRow, {marginTop: spacing.lg, gap: spacing.sm}]}>
              <View style={[styles.metricItem, {backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md}]}>
                <AppIcon name="clock-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.metricLabel, {color: colors.textTertiary}]}>ETA</Text>
                <Text style={[styles.metricValue, {color: colors.text}]}>
                  {goalMetrics.etaDays === null
                    ? 'N/A'
                    : goalMetrics.etaDays === 0
                      ? 'Done'
                      : `${goalMetrics.etaDays}d`}
                </Text>
              </View>
              <View style={[styles.metricItem, {backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md}]}>
                <AppIcon
                  name={goalMetrics.isOnTrack ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={goalMetrics.isOnTrack ? colors.success : colors.warning}
                />
                <Text style={[styles.metricLabel, {color: colors.textTertiary}]}>Status</Text>
                <Text style={[styles.metricValue, {color: goalMetrics.isOnTrack ? colors.success : colors.warning}]}>
                  {goalMetrics.isOnTrack ? 'On track' : 'Behind'}
                </Text>
              </View>
              <View style={[styles.metricItem, {backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md}]}>
                <AppIcon name="currency-usd" size={16} color={colors.textTertiary} />
                <Text style={[styles.metricLabel, {color: colors.textTertiary}]}>Left</Text>
                <Text style={[styles.metricValue, {color: colors.text}]} numberOfLines={1}>
                  {formatAmountMasked(Math.max(0, goalMetrics.remaining), goal.currency, hide)}
                </Text>
              </View>
            </View>
          </View>

          {!goal.isCompleted && (
            <Button fullWidth onPress={openContribModal} size="lg" title="Add Contribution" />
          )}

          {canMarkComplete && (
            <Button
              fullWidth
              loading={isSubmitting}
              onPress={handleMarkComplete}
              size="lg"
              title="Mark Complete"
            />
          )}

          <Button fullWidth onPress={handleEdit} size="lg" title="Edit" variant="outline" />
        </View>
      </ScreenContainer>

      <Modal
        animationType="slide"
        onRequestClose={() => setContribModalOpen(false)}
        transparent
        visible={contribModalOpen}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setContribModalOpen(false)}
            style={styles.modalBackdropTouch}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surfaceElevated,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
              },
              shadows.lg,
            ]}>
            <View style={[styles.modalHandle, {backgroundColor: colors.border}]} />

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                paddingBottom: spacing['2xl'],
              }}>
              <View style={styles.modalHeaderRow}>
                <View style={{flex: 1}}>
                  <Text style={[styles.modalTitle, {color: colors.text}]}>
                    Add Contribution
                  </Text>
                  <Text style={[styles.modalSubtitle, {color: colors.textTertiary}]}>
                    {goal.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close"
                  hitSlop={12}
                  onPress={() => setContribModalOpen(false)}
                  style={[styles.modalCloseBtn, {backgroundColor: colors.border + '44'}]}>
                  <MaterialCommunityIcons color={colors.textSecondary} name="close" size={18} />
                </Pressable>
              </View>

              <View
                style={[
                  styles.modalProgressRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                  },
                ]}>
                <View style={styles.modalProgressInfo}>
                  <Text style={[styles.modalProgressLabel, {color: colors.textTertiary}]}>
                    Current
                  </Text>
                  <Text style={[styles.modalProgressValue, {color: colors.text}]}>
                    {formatAmountMasked(goal.currentAmount, goal.currency, hide)}
                  </Text>
                </View>
                <View style={[styles.modalProgressDivider, {backgroundColor: colors.border}]} />
                <View style={styles.modalProgressInfo}>
                  <Text style={[styles.modalProgressLabel, {color: colors.textTertiary}]}>
                    Target
                  </Text>
                  <Text style={[styles.modalProgressValue, {color: colors.textSecondary}]}>
                    {formatAmountMasked(goal.targetAmount, goal.currency, hide)}
                  </Text>
                </View>
                <View style={[styles.modalProgressDivider, {backgroundColor: colors.border}]} />
                <View style={styles.modalProgressInfo}>
                  <Text style={[styles.modalProgressLabel, {color: colors.textTertiary}]}>
                    Left
                  </Text>
                  <Text style={[styles.modalProgressValue, {color: goal.color}]}>
                    {formatAmountMasked(
                      Math.max(0, goal.targetAmount - goal.currentAmount),
                      goal.currency,
                      hide,
                    )}
                  </Text>
                </View>
              </View>

              <Text style={[styles.modalInputLabel, {color: colors.textSecondary, marginTop: spacing.lg}]}>
                CONTRIBUTION AMOUNT
              </Text>
              <Pressable
                onPress={() => {}}
                style={[
                  styles.modalAmountBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: contribCents > 0 ? colors.primary : colors.border,
                    borderWidth: contribCents > 0 ? 2 : 1,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    marginTop: spacing.sm,
                  },
                ]}>
                <AmountInput
                  autoFocus
                  currency={goal.currency}
                  onChangeValue={setContribCents}
                  value={contribCents}
                />
              </Pressable>

              <View style={[styles.quickAmountRow, {marginTop: spacing.md}]}>
                {[1000, 5000, 10000, 50000].map((cents) => (
                  <Pressable
                    key={cents}
                    accessibilityLabel={`Add ${cents / 100}`}
                    onPress={() => setContribCents(cents)}
                    style={({pressed}) => [
                      styles.quickAmountChip,
                      {
                        backgroundColor: contribCents === cents
                          ? colors.primary + '20'
                          : colors.card,
                        borderColor: contribCents === cents
                          ? colors.primary
                          : colors.border,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.quickAmountText,
                        {color: contribCents === cents ? colors.primary : colors.text},
                      ]}>
                      {formatAmountMasked(cents, goal.currency, false)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                accessibilityLabel="Add contribution"
                accessibilityRole="button"
                disabled={contribCents <= 0 || isSubmitting}
                onPress={handleAddContribution}
                style={({pressed}) => [
                  styles.modalAddBtn,
                  {
                    backgroundColor: contribCents > 0 ? colors.primary : colors.border,
                    borderRadius: radius.lg,
                    marginTop: spacing.xl,
                    opacity: pressed && contribCents > 0 ? 0.85 : 1,
                  },
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons color="#FFFFFF" name="plus-circle" size={22} />
                    <Text style={styles.modalAddBtnText}>
                      {contribCents > 0
                        ? `Add ${formatAmountMasked(contribCents, goal.currency, false)}`
                        : 'Enter an amount'}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityLabel="Cancel"
                onPress={() => setContribModalOpen(false)}
                style={({pressed}) => [
                  styles.modalCancelBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    marginTop: spacing.sm,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}>
                <Text style={[styles.modalCancelText, {color: colors.textSecondary}]}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 18, fontWeight: fontWeight.semibold},
  deleteHeaderBtn: {fontSize: 14, fontWeight: fontWeight.semibold, minWidth: 52, textAlign: 'right'},
  heroCard: {borderWidth: StyleSheet.hairlineWidth},
  heroTopRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: {fontSize: 20, fontWeight: fontWeight.bold},
  categoryLine: {fontSize: 13, textTransform: 'capitalize', marginTop: 2},
  statusPill: {paddingHorizontal: 10, paddingVertical: 4},
  statusPillText: {fontSize: 12, fontWeight: fontWeight.semibold},
  deadlineLine: {fontSize: 14, fontWeight: fontWeight.medium},
  deadlineSub: {fontSize: 13, marginTop: 4},
  savedLabel: {fontSize: 12, fontWeight: fontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase'},
  savedMajor: {fontSize: 30, fontWeight: fontWeight.bold, marginTop: 6},
  ofLine: {fontSize: 14, marginTop: 4},
  pctLine: {fontSize: 14, textAlign: 'center'},
  metricsRow: {flexDirection: 'row'},
  metricItem: {flex: 1, alignItems: 'center', gap: 4},
  metricLabel: {fontSize: 11, fontWeight: fontWeight.semibold, letterSpacing: 0.4, textTransform: 'uppercase'},
  metricValue: {fontSize: 14, fontWeight: fontWeight.bold},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalSheet: {
    maxHeight: '85%',
    paddingTop: 12,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {fontSize: 22, fontWeight: fontWeight.bold},
  modalSubtitle: {fontSize: 14, marginTop: 4},
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalProgressInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  modalProgressDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  modalProgressLabel: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalProgressValue: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
  },
  modalAmountBox: {},
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAmountChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  modalAddBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  modalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
});
