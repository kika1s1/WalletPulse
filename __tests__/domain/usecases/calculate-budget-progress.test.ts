import {createBudget, type CreateBudgetInput} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import {createDateRange} from '@domain/value-objects/DateRange';
import {makeCalculateBudgetProgress} from '@domain/usecases/calculate-budget-progress';

const start = 1_704_000_000_000;
const end = start + 86_400_000;

const baseBudgetInput: CreateBudgetInput = {
  id: 'budget-1',
  categoryId: 'cat-food',
  amount: 10_000,
  currency: 'USD',
  period: 'monthly',
  startDate: start,
  endDate: end,
  rollover: false,
  isActive: true,
  createdAt: 1,
  updatedAt: 2,
};

function createBudgetRepoMock(): jest.Mocked<IBudgetRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCategoryId: jest.fn(),
    findActiveByCategoryId: jest.fn(),
    findOverallBudget: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function createTransactionRepoMock(): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWalletId: jest.fn(),
    findByCategoryId: jest.fn(),
    findBySourceHash: jest.fn(),
    findRecent: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByFilter: jest.fn(),
    sumByFilter: jest.fn(),
  };
}

describe('makeCalculateBudgetProgress', () => {
  it("returns status 'under' when spent is below 50% of budget", async () => {
    const budget = createBudget(baseBudgetInput);
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(4_000);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    const result = await run(budget.id);

    expect(result.status).toBe('under');
    expect(result.percentage.value).toBe(40);
    expect(result.spent).toBe(4_000);
    expect(result.remaining).toBe(6_000);
    expect(result.budget).toEqual(budget);
  });

  it("returns status 'warning' when spent is exactly 50% of budget", async () => {
    const budget = createBudget(baseBudgetInput);
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(5_000);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    const result = await run(budget.id);

    expect(result.status).toBe('warning');
    expect(result.percentage.value).toBe(50);
  });

  it("returns status 'danger' when spent is 85% of budget", async () => {
    const budget = createBudget(baseBudgetInput);
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(8_500);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    const result = await run(budget.id);

    expect(result.status).toBe('danger');
    expect(result.percentage.value).toBe(85);
  });

  it("returns status 'exceeded' when spent is above 100% of budget", async () => {
    const budget = createBudget(baseBudgetInput);
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(11_000);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    const result = await run(budget.id);

    expect(result.status).toBe('exceeded');
    expect(result.percentage.value).toBeCloseTo(110, 10);
  });

  it('throws when budget is not found', async () => {
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(null);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});

    await expect(run('missing')).rejects.toThrow('Budget not found');
    expect(transactionRepo.sumByFilter).not.toHaveBeenCalled();
  });

  it('sums expenses with date range, currency, category, and expense type', async () => {
    const budget = createBudget(baseBudgetInput);
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(0);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    await run(budget.id);

    expect(transactionRepo.sumByFilter).toHaveBeenCalledWith({
      type: 'expense',
      currency: budget.currency,
      dateRange: createDateRange(budget.startDate, budget.endDate),
      categoryId: budget.categoryId ?? undefined,
    });
  });

  it('omits categoryId filter for overall budgets', async () => {
    const budget = createBudget({...baseBudgetInput, id: 'overall-1', categoryId: null});
    const budgetRepo = createBudgetRepoMock();
    const transactionRepo = createTransactionRepoMock();
    budgetRepo.findById.mockResolvedValue(budget);
    transactionRepo.sumByFilter.mockResolvedValue(0);

    const run = makeCalculateBudgetProgress({budgetRepo, transactionRepo});
    await run(budget.id);

    expect(transactionRepo.sumByFilter).toHaveBeenCalledWith({
      type: 'expense',
      currency: budget.currency,
      dateRange: createDateRange(budget.startDate, budget.endDate),
    });
  });
});
