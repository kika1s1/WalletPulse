import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import {createBudget, type CreateBudgetInput, type Budget} from '@domain/entities/Budget';

export type MakeCreateBudgetDeps = {
  budgetRepo: IBudgetRepository;
};

export function makeCreateBudget({budgetRepo}: MakeCreateBudgetDeps) {
  return async (input: CreateBudgetInput): Promise<Budget> => {
    const budget = createBudget(input);

    if (budget.categoryId) {
      const existing = await budgetRepo.findActiveByCategoryId(budget.categoryId);
      if (existing && existing.id !== budget.id) {
        throw new Error('An active budget already exists for this category');
      }
    } else {
      const overall = await budgetRepo.findOverallBudget();
      if (overall && overall.id !== budget.id) {
        throw new Error('An active overall budget already exists');
      }
    }

    await budgetRepo.save(budget);
    return budget;
  };
}
