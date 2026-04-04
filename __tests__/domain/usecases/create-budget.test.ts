import {createBudget, type CreateBudgetInput} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import {makeCreateBudget} from '@domain/usecases/create-budget';

const start = 1_704_000_000_000;
const end = start + 30 * 86_400_000;

const validInput: CreateBudgetInput = {
  id: 'b-1',
  categoryId: 'cat-food',
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
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findActive: jest.fn().mockResolvedValue([]),
    findByCategoryId: jest.fn().mockResolvedValue([]),
    findActiveByCategoryId: jest.fn().mockResolvedValue(null),
    findOverallBudget: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('makeCreateBudget', () => {
  it('creates a valid category budget', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});
    const result = await create(validInput);

    expect(result.id).toBe('b-1');
    expect(result.amount).toBe(50_000);
    expect(result.currency).toBe('USD');
    expect(result.categoryId).toBe('cat-food');
    expect(result.period).toBe('monthly');
    expect(result.isActive).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('creates an overall budget when categoryId is null', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});
    const result = await create({...validInput, id: 'b-overall', categoryId: null});

    expect(result.categoryId).toBeNull();
    expect(repo.findOverallBudget).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects duplicate active budget for same category', async () => {
    const repo = mockBudgetRepo();
    repo.findActiveByCategoryId.mockResolvedValue(createBudget({...validInput, id: 'existing'}));
    const create = makeCreateBudget({budgetRepo: repo});

    await expect(create(validInput)).rejects.toThrow(
      'An active budget already exists for this category',
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('rejects duplicate overall budget', async () => {
    const repo = mockBudgetRepo();
    repo.findOverallBudget.mockResolvedValue(
      createBudget({...validInput, id: 'old-overall', categoryId: null}),
    );
    const create = makeCreateBudget({budgetRepo: repo});

    await expect(
      create({...validInput, id: 'new-overall', categoryId: null}),
    ).rejects.toThrow('An active overall budget already exists');
  });

  it('validates budget amount is positive', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});

    await expect(create({...validInput, amount: 0})).rejects.toThrow(
      'Budget amount must be positive',
    );
    await expect(create({...validInput, amount: -100})).rejects.toThrow(
      'Budget amount must be positive',
    );
  });

  it('validates start date is before end date', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});

    await expect(
      create({...validInput, startDate: end, endDate: start}),
    ).rejects.toThrow('Start date must be before end date');
  });

  it('validates currency is 3-letter ISO code', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});

    await expect(create({...validInput, currency: 'X'})).rejects.toThrow(
      'Currency must be a 3-letter ISO code',
    );
  });

  it('normalizes currency to uppercase', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});
    const result = await create({...validInput, currency: 'usd'});

    expect(result.currency).toBe('USD');
  });

  it('sets rollover flag correctly', async () => {
    const repo = mockBudgetRepo();
    const create = makeCreateBudget({budgetRepo: repo});
    const result = await create({...validInput, rollover: true});

    expect(result.rollover).toBe(true);
  });
});
