import {createBudget, type CreateBudgetInput} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import {makeUpdateBudget} from '@domain/usecases/update-budget';

const start = 1_704_000_000_000;
const end = start + 30 * 86_400_000;

const budgetInput: CreateBudgetInput = {
  id: 'b-upd-1',
  categoryId: 'cat-1',
  amount: 50_000,
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
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
  };
}

describe('makeUpdateBudget', () => {
  it('updates an existing budget', async () => {
    const repo = mockBudgetRepo();
    const existing = createBudget(budgetInput);
    repo.findById.mockResolvedValue(existing);

    const updateBudget = makeUpdateBudget({budgetRepo: repo});
    const updated = await updateBudget({...existing, amount: 80_000});

    expect(updated.amount).toBe(80_000);
    expect(updated.updatedAt).toBeGreaterThan(0);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws when budget does not exist', async () => {
    const repo = mockBudgetRepo();
    repo.findById.mockResolvedValue(null);

    const updateBudget = makeUpdateBudget({budgetRepo: repo});
    const budget = createBudget(budgetInput);

    await expect(updateBudget(budget)).rejects.toThrow('Budget not found');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('preserves fields not being updated', async () => {
    const repo = mockBudgetRepo();
    const existing = createBudget(budgetInput);
    repo.findById.mockResolvedValue(existing);

    const updateBudget = makeUpdateBudget({budgetRepo: repo});
    const updated = await updateBudget({...existing, rollover: true});

    expect(updated.categoryId).toBe(existing.categoryId);
    expect(updated.currency).toBe(existing.currency);
    expect(updated.period).toBe(existing.period);
    expect(updated.rollover).toBe(true);
  });

  it('sets updatedAt timestamp', async () => {
    const repo = mockBudgetRepo();
    const existing = createBudget(budgetInput);
    repo.findById.mockResolvedValue(existing);

    const before = Date.now();
    const updateBudget = makeUpdateBudget({budgetRepo: repo});
    const updated = await updateBudget(existing);

    expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('can deactivate a budget', async () => {
    const repo = mockBudgetRepo();
    const existing = createBudget(budgetInput);
    repo.findById.mockResolvedValue(existing);

    const updateBudget = makeUpdateBudget({budgetRepo: repo});
    const updated = await updateBudget({...existing, isActive: false});

    expect(updated.isActive).toBe(false);
  });
});
