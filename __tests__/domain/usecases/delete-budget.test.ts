import {createBudget, type CreateBudgetInput} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import {makeDeleteBudget} from '@domain/usecases/delete-budget';

const start = 1_704_000_000_000;
const end = start + 30 * 86_400_000;

const budgetInput: CreateBudgetInput = {
  id: 'b-del-1',
  categoryId: 'cat-1',
  amount: 30_000,
  currency: 'USD',
  period: 'monthly',
  startDate: start,
  endDate: end,
  rollover: false,
  isActive: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function mockBudgetRepo(): jest.Mocked<IBudgetRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCategoryId: jest.fn(),
    findActiveByCategoryId: jest.fn(),
    findOverallBudget: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('makeDeleteBudget', () => {
  it('deletes an existing budget', async () => {
    const repo = mockBudgetRepo();
    repo.findById.mockResolvedValue(createBudget(budgetInput));
    const deleteBudget = makeDeleteBudget({budgetRepo: repo});

    await deleteBudget('b-del-1');

    expect(repo.findById).toHaveBeenCalledWith('b-del-1');
    expect(repo.delete).toHaveBeenCalledWith('b-del-1');
  });

  it('throws when budget does not exist', async () => {
    const repo = mockBudgetRepo();
    repo.findById.mockResolvedValue(null);
    const deleteBudget = makeDeleteBudget({budgetRepo: repo});

    await expect(deleteBudget('nonexistent')).rejects.toThrow('Budget not found');
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
