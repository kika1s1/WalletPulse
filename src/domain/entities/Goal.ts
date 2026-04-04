export type GoalCategory =
  | 'emergency'
  | 'vacation'
  | 'purchase'
  | 'investment'
  | 'custom';

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: number;
  icon: string;
  color: string;
  category: GoalCategory;
  isCompleted: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateGoalInput = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: number;
  icon: string;
  color: string;
  category: GoalCategory;
  isCompleted: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
};

const VALID_GOAL_CATEGORIES: readonly GoalCategory[] = [
  'emergency',
  'vacation',
  'purchase',
  'investment',
  'custom',
];

function isThreeLetterIsoCurrency(code: string): boolean {
  return code.length === 3 && /^[A-Za-z]{3}$/.test(code);
}

export function createGoal(input: CreateGoalInput): Goal {
  if (!input.name.trim()) {
    throw new Error('Goal name is required');
  }
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
    throw new Error('Target amount must be positive (cents)');
  }
  if (!VALID_GOAL_CATEGORIES.includes(input.category)) {
    throw new Error('Invalid goal category');
  }
  if (!isThreeLetterIsoCurrency(input.currency)) {
    throw new Error('Currency must be a 3-letter ISO code');
  }

  return {
    id: input.id,
    name: input.name.trim(),
    targetAmount: input.targetAmount,
    currentAmount: input.currentAmount,
    currency: input.currency.toUpperCase(),
    deadline: input.deadline,
    icon: input.icon,
    color: input.color,
    category: input.category,
    isCompleted: input.isCompleted,
    completedAt: input.completedAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function getProgress(g: Goal): number {
  if (g.targetAmount <= 0) {
    return 0;
  }
  const ratio = g.currentAmount / g.targetAmount;
  if (ratio < 0) {
    return 0;
  }
  if (ratio > 1) {
    return 1;
  }
  return ratio;
}

export function isOverdue(g: Goal, nowMs: number): boolean {
  return g.deadline < nowMs && !g.isCompleted;
}

export function getRemainingAmount(g: Goal): number {
  return g.targetAmount - g.currentAmount;
}
