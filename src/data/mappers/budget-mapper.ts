import type {Budget, BudgetPeriod} from '@domain/entities/Budget';

export type BudgetRaw = {
  id: string;
  categoryId: string | null;
  amount: number;
  currency: string;
  period: string;
  startDate: number;
  endDate: number;
  rollover: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: BudgetRaw): Budget {
  return {
    id: raw.id,
    categoryId: raw.categoryId,
    amount: raw.amount,
    currency: raw.currency,
    period: raw.period as BudgetPeriod,
    startDate: raw.startDate,
    endDate: raw.endDate,
    rollover: raw.rollover,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Budget): Omit<BudgetRaw, 'id'> {
  return {
    categoryId: entity.categoryId,
    amount: entity.amount,
    currency: entity.currency,
    period: entity.period,
    startDate: entity.startDate,
    endDate: entity.endDate,
    rollover: entity.rollover,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
