import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {Budget} from '@domain/entities/Budget';

export type MakeUpdateBudgetDeps = {
  budgetRepo: IBudgetRepository;
};

export function makeUpdateBudget({budgetRepo}: MakeUpdateBudgetDeps) {
  return async (budget: Budget): Promise<Budget> => {
    const existing = await budgetRepo.findById(budget.id);
    if (!existing) {
      throw new Error('Budget not found');
    }

    const updated: Budget = {
      ...budget,
      updatedAt: Date.now(),
    };

    await budgetRepo.update(updated);
    return updated;
  };
}
