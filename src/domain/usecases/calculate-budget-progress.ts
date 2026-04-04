import type {Budget} from '@domain/entities/Budget';
import {isOverallBudget} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {ITransactionRepository, TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {createDateRange} from '@domain/value-objects/DateRange';
import {calculatePercentage, type Percentage} from '@domain/value-objects/Percentage';

export type BudgetProgressStatus = 'under' | 'warning' | 'danger' | 'exceeded';

export type CalculateBudgetProgressResult = {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: Percentage;
  status: BudgetProgressStatus;
};

function resolveStatus(percentageValue: number): BudgetProgressStatus {
  if (percentageValue > 100) {
    return 'exceeded';
  }
  if (percentageValue >= 80) {
    return 'danger';
  }
  if (percentageValue >= 50) {
    return 'warning';
  }
  return 'under';
}

export type MakeCalculateBudgetProgressDeps = {
  budgetRepo: IBudgetRepository;
  transactionRepo: ITransactionRepository;
};

export function makeCalculateBudgetProgress(deps: MakeCalculateBudgetProgressDeps) {
  const {budgetRepo, transactionRepo} = deps;

  return async function calculateBudgetProgress(
    budgetId: string,
  ): Promise<CalculateBudgetProgressResult> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const filter: TransactionFilter = {
      type: 'expense',
      currency: budget.currency,
      dateRange: createDateRange(budget.startDate, budget.endDate),
    };
    if (!isOverallBudget(budget) && budget.categoryId) {
      filter.categoryId = budget.categoryId;
    }

    const spent = await transactionRepo.sumByFilter(filter);
    const remaining = budget.amount - spent;
    const percentage = calculatePercentage(spent, budget.amount);
    const status = resolveStatus(percentage.value);

    return {budget, spent, remaining, percentage, status};
  };
}
