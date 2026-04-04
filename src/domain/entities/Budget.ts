export type BudgetPeriod = 'weekly' | 'monthly';

export type Budget = {
  id: string;
  categoryId: string | null;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  startDate: number;
  endDate: number;
  rollover: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateBudgetInput = {
  id: string;
  categoryId?: string | null;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  startDate: number;
  endDate: number;
  rollover: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

const VALID_PERIODS: readonly BudgetPeriod[] = ['weekly', 'monthly'];

function isThreeLetterIsoCurrency(code: string): boolean {
  return code.length === 3 && /^[A-Za-z]{3}$/.test(code);
}

export function createBudget(input: CreateBudgetInput): Budget {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Budget amount must be positive (cents)');
  }
  if (!VALID_PERIODS.includes(input.period)) {
    throw new Error('Invalid budget period');
  }
  if (input.startDate >= input.endDate) {
    throw new Error('Start date must be before end date');
  }
  if (!isThreeLetterIsoCurrency(input.currency)) {
    throw new Error('Currency must be a 3-letter ISO code');
  }

  const categoryId =
    input.categoryId === undefined || input.categoryId === null ? null : input.categoryId;

  return {
    id: input.id,
    categoryId,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    period: input.period,
    startDate: input.startDate,
    endDate: input.endDate,
    rollover: input.rollover,
    isActive: input.isActive,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function isOverallBudget(b: Budget): boolean {
  return b.categoryId === null || b.categoryId === undefined;
}

export function isExpired(b: Budget, nowMs: number): boolean {
  return nowMs > b.endDate;
}
