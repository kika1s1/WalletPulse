import type {Goal, GoalCategory} from '@domain/entities/Goal';

export type GoalRaw = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: number;
  icon: string;
  color: string;
  category: string;
  isCompleted: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

function nullToUndefined(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

function undefinedToNull(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

export function toDomain(raw: GoalRaw): Goal {
  return {
    id: raw.id,
    name: raw.name,
    targetAmount: raw.targetAmount,
    currentAmount: raw.currentAmount,
    currency: raw.currency,
    deadline: raw.deadline,
    icon: raw.icon,
    color: raw.color,
    category: raw.category as GoalCategory,
    isCompleted: raw.isCompleted,
    completedAt: nullToUndefined(raw.completedAt),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Goal): Omit<GoalRaw, 'id'> {
  return {
    name: entity.name,
    targetAmount: entity.targetAmount,
    currentAmount: entity.currentAmount,
    currency: entity.currency,
    deadline: entity.deadline,
    icon: entity.icon,
    color: entity.color,
    category: entity.category,
    isCompleted: entity.isCompleted,
    completedAt: undefinedToNull(entity.completedAt),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
