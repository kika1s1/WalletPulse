import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';

export type MakeDeleteBudgetDeps = {
  budgetRepo: IBudgetRepository;
};

export function makeDeleteBudget({budgetRepo}: MakeDeleteBudgetDeps) {
  return async (budgetId: string): Promise<void> => {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }
    await budgetRepo.delete(budgetId);
  };
}
