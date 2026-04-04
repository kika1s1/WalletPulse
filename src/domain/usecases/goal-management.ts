import type {Goal} from '@domain/entities/Goal';

const MS_PER_DAY = 86400000;

export function sortGoalsByPriority(goals: Goal[], nowMs: number): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const aOverdue = a.deadline < nowMs && !a.isCompleted;
    const bOverdue = b.deadline < nowMs && !b.isCompleted;
    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }
    return a.deadline - b.deadline;
  });
}

export type GoalGroups = {
  active: Goal[];
  completed: Goal[];
  overdue: Goal[];
};

export function groupGoalsByStatus(goals: Goal[], nowMs: number): GoalGroups {
  const active: Goal[] = [];
  const completed: Goal[] = [];
  const overdue: Goal[] = [];

  for (const g of goals) {
    if (g.isCompleted) {
      completed.push(g);
    } else if (g.deadline < nowMs) {
      overdue.push(g);
    } else {
      active.push(g);
    }
  }

  return {active, completed, overdue};
}

export function calculateTotalProgress(goals: Goal[]): number {
  if (goals.length === 0) return 0;

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);

  if (totalTarget <= 0) return 0;
  return Math.min(totalCurrent / totalTarget, 1);
}

export function formatDeadline(deadlineMs: number, nowMs: number): string {
  const diff = deadlineMs - nowMs;
  const days = Math.ceil(diff / MS_PER_DAY);

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function getGoalStatusLabel(goal: Goal, nowMs: number): string {
  if (goal.isCompleted) return 'Completed';
  if (goal.deadline < nowMs) return 'Overdue';
  return 'In Progress';
}
