import type {Goal} from '@domain/entities/Goal';
import {getRemainingAmount} from '@domain/entities/Goal';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import {calculatePercentage, type Percentage} from '@domain/value-objects/Percentage';

const MS_PER_DAY = 86_400_000;

export type CalculateGoalProgressResult = {
  goal: Goal;
  percentage: Percentage;
  remainingAmount: number;
  estimatedDaysToComplete: number | null;
  isOnTrack: boolean;
};

function computeEstimatedDaysToComplete(goal: Goal, nowMs: number): number | null {
  if (goal.currentAmount >= goal.targetAmount) {
    return 0;
  }
  const elapsedMs = nowMs - goal.createdAt;
  const elapsedDays = Math.max(elapsedMs / MS_PER_DAY, 1);
  const ratePerDay = goal.currentAmount / elapsedDays;
  if (ratePerDay <= 0) {
    return null;
  }
  const remaining = getRemainingAmount(goal);
  return Math.ceil(remaining / ratePerDay);
}

function computeIsOnTrack(
  goal: Goal,
  nowMs: number,
  estimatedDaysToComplete: number | null,
): boolean {
  if (goal.currentAmount >= goal.targetAmount) {
    return nowMs <= goal.deadline;
  }
  if (estimatedDaysToComplete === null) {
    return false;
  }
  const estimatedEndMs = nowMs + estimatedDaysToComplete * MS_PER_DAY;
  return estimatedEndMs <= goal.deadline;
}

export type MakeCalculateGoalProgressDeps = {
  goalRepo: IGoalRepository;
};

export function makeCalculateGoalProgress(deps: MakeCalculateGoalProgressDeps) {
  const {goalRepo} = deps;

  return async function calculateGoalProgress(goalId: string): Promise<CalculateGoalProgressResult> {
    const goal = await goalRepo.findById(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const currentNow = Date.now();
    const percentage = calculatePercentage(goal.currentAmount, goal.targetAmount);
    const remainingAmount = getRemainingAmount(goal);
    const estimatedDaysToComplete = computeEstimatedDaysToComplete(goal, currentNow);
    const isOnTrack = computeIsOnTrack(goal, currentNow, estimatedDaysToComplete);

    return {
      goal,
      percentage,
      remainingAmount,
      estimatedDaysToComplete,
      isOnTrack,
    };
  };
}
