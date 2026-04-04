import {createGoal, type CreateGoalInput} from '@domain/entities/Goal';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import {makeCalculateGoalProgress} from '@domain/usecases/calculate-goal-progress';

const MS_PER_DAY = 86_400_000;

const baseGoalInput: CreateGoalInput = {
  id: 'goal-1',
  name: 'Emergency fund',
  targetAmount: 10_000,
  currentAmount: 0,
  currency: 'USD',
  deadline: 2_000_000_000_000,
  icon: 'pig',
  color: '#000',
  category: 'emergency',
  isCompleted: false,
  createdAt: 1_000_000,
  updatedAt: 1_000_000,
};

function createGoalRepoMock(): jest.Mocked<IGoalRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findCompleted: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    updateProgress: jest.fn(),
    markCompleted: jest.fn(),
    delete: jest.fn(),
  };
}

describe('makeCalculateGoalProgress', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates partial progress, remaining amount, and percentage', async () => {
    jest.useFakeTimers();
    const createdAt = 1_700_000_000_000;
    jest.setSystemTime(createdAt + MS_PER_DAY);
    const goal = createGoal({
      ...baseGoalInput,
      targetAmount: 10_000,
      currentAmount: 2_500,
      createdAt,
    });
    const goalRepo = createGoalRepoMock();
    goalRepo.findById.mockResolvedValue(goal);

    const run = makeCalculateGoalProgress({goalRepo});
    const result = await run(goal.id);

    expect(result.percentage.value).toBe(25);
    expect(result.remainingAmount).toBe(7_500);
    expect(result.goal).toEqual(goal);
  });

  it('handles completed goals at 100% or more', async () => {
    jest.useFakeTimers();
    const createdAt = 1_700_000_000_000;
    const deadline = createdAt + 30 * MS_PER_DAY;
    jest.setSystemTime(createdAt + 5 * MS_PER_DAY);
    const goal = createGoal({
      ...baseGoalInput,
      targetAmount: 10_000,
      currentAmount: 11_000,
      deadline,
      createdAt,
    });
    const goalRepo = createGoalRepoMock();
    goalRepo.findById.mockResolvedValue(goal);

    const run = makeCalculateGoalProgress({goalRepo});
    const result = await run(goal.id);

    expect(result.percentage.value).toBeCloseTo(110, 10);
    expect(result.estimatedDaysToComplete).toBe(0);
    expect(result.isOnTrack).toBe(true);
  });

  it('throws when goal is not found', async () => {
    const goalRepo = createGoalRepoMock();
    goalRepo.findById.mockResolvedValue(null);

    const run = makeCalculateGoalProgress({goalRepo});

    await expect(run('missing')).rejects.toThrow('Goal not found');
  });

  it('estimates days to complete from average saving rate since createdAt', async () => {
    jest.useFakeTimers();
    const createdAt = 1_700_000_000_000;
    jest.setSystemTime(createdAt + 10 * MS_PER_DAY);
    const goal = createGoal({
      ...baseGoalInput,
      targetAmount: 10_000,
      currentAmount: 1_000,
      createdAt,
    });
    const goalRepo = createGoalRepoMock();
    goalRepo.findById.mockResolvedValue(goal);

    const run = makeCalculateGoalProgress({goalRepo});
    const result = await run(goal.id);

    expect(result.estimatedDaysToComplete).toBe(90);
  });

  it('marks not on track when projected completion is after the deadline', async () => {
    jest.useFakeTimers();
    const createdAt = 1_700_000_000_000;
    const deadline = createdAt + 20 * MS_PER_DAY;
    jest.setSystemTime(createdAt + 10 * MS_PER_DAY);
    const goal = createGoal({
      ...baseGoalInput,
      targetAmount: 10_000,
      currentAmount: 1_000,
      deadline,
      createdAt,
    });
    const goalRepo = createGoalRepoMock();
    goalRepo.findById.mockResolvedValue(goal);

    const run = makeCalculateGoalProgress({goalRepo});
    const result = await run(goal.id);

    expect(result.isOnTrack).toBe(false);
  });
});
