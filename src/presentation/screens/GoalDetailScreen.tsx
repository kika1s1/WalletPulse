import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import {getProgress} from '@domain/entities/Goal';
import {formatDeadline, getGoalStatusLabel} from '@domain/usecases/goal-management';
import {useGoals, useGoalActions} from '@presentation/hooks/useGoals';

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
  const now = Date.now();

  const [contribModalOpen, setContribModalOpen] = useState(false);
  const [contribCents, setContribCents] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const progressRatio = goal ? getProgress(goal) : 0;
  const pctRounded = Math.round(progressRatio * 100);
  const canMarkComplete = goal && !goal.isCompleted && progressRatio >= 1;

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
        animationType="fade"
        onRequestClose={() => setContribModalOpen(false)}
        transparent
        visible={contribModalOpen}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setContribModalOpen(false)}
          style={styles.modalBackdrop}>
          <Pressable onPress={() => {}} style={styles.modalCardOuter}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                },
                shadows.md,
              ]}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>Add contribution</Text>
              <Text style={[styles.modalHint, {color: colors.textTertiary}]}>
                Amount to add to your saved total
              </Text>
              <View
                style={[
                  styles.amountWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                    borderRadius: radius.md,
                    marginTop: spacing.md,
                    padding: spacing.md,
                  },
                ]}>
                <AmountInput
                  autoFocus
                  currency={goal.currency}
                  onChangeValue={setContribCents}
                  value={contribCents}
                />
              </View>
              <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg}}>
                <View style={{flex: 1}}>
                  <Button
                    fullWidth
                    onPress={() => setContribModalOpen(false)}
                    title="Cancel"
                    variant="ghost"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Button
                    disabled={contribCents <= 0}
                    fullWidth
                    loading={isSubmitting}
                    onPress={handleAddContribution}
                    title="Add"
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCardOuter: {maxWidth: '100%'},
  modalCard: {borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent'},
  modalTitle: {fontSize: 18, fontWeight: fontWeight.semibold},
  modalHint: {fontSize: 13, marginTop: 4},
  amountWrap: {borderWidth: StyleSheet.hairlineWidth},
});
