import {
  sortGoalsByPriority,
  groupGoalsByStatus,
  calculateTotalProgress,
  formatDeadline,
  getGoalStatusLabel,
} from '@domain/usecases/goal-management';
import type {Goal} from '@domain/entities/Goal';

const DAY = 86400000;
const now = Date.now();

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Emergency Fund',
    targetAmount: 100000,
    currentAmount: 50000,
    currency: 'USD',
    deadline: now + 90 * DAY,
    icon: 'bank',
    color: '#4CAF50',
    category: 'emergency',
    isCompleted: false,
    createdAt: now - 30 * DAY,
    updatedAt: now,
    ...overrides,
  };
}

describe('goal-management', () => {
  describe('sortGoalsByPriority', () => {
    it('puts non-completed goals before completed', () => {
      const goals = [
        makeGoal({id: 'done', isCompleted: true}),
        makeGoal({id: 'active', isCompleted: false}),
      ];
      const sorted = sortGoalsByPriority(goals, now);
      expect(sorted[0].id).toBe('active');
    });

    it('sorts active goals by deadline (closest first)', () => {
      const goals = [
        makeGoal({id: 'far', deadline: now + 100 * DAY}),
        makeGoal({id: 'near', deadline: now + 10 * DAY}),
      ];
      const sorted = sortGoalsByPriority(goals, now);
      expect(sorted[0].id).toBe('near');
    });
  });

  describe('groupGoalsByStatus', () => {
    it('groups into active, completed, and overdue', () => {
      const goals = [
        makeGoal({id: 'active'}),
        makeGoal({id: 'done', isCompleted: true, completedAt: now}),
        makeGoal({id: 'overdue', deadline: now - 5 * DAY}),
      ];
      const groups = groupGoalsByStatus(goals, now);
      expect(groups.active.length).toBe(1);
      expect(groups.completed.length).toBe(1);
      expect(groups.overdue.length).toBe(1);
    });
  });

  describe('calculateTotalProgress', () => {
    it('returns aggregated progress across all goals', () => {
      const goals = [
        makeGoal({targetAmount: 100000, currentAmount: 50000}),
        makeGoal({id: 'g2', targetAmount: 200000, currentAmount: 100000}),
      ];
      const progress = calculateTotalProgress(goals);
      expect(progress).toBeCloseTo(0.5);
    });

    it('returns 0 for empty goals', () => {
      expect(calculateTotalProgress([])).toBe(0);
    });

    it('caps at 1 when all goals exceeded', () => {
      const goals = [makeGoal({targetAmount: 100, currentAmount: 200})];
      expect(calculateTotalProgress(goals)).toBeLessThanOrEqual(1);
    });
  });

  describe('formatDeadline', () => {
    it('formats as days remaining', () => {
      const label = formatDeadline(now + 10 * DAY, now);
      expect(label).toContain('10');
      expect(label).toContain('day');
    });

    it('shows overdue for past deadlines', () => {
      const label = formatDeadline(now - 5 * DAY, now);
      expect(label.toLowerCase()).toContain('overdue');
    });
  });

  describe('getGoalStatusLabel', () => {
    it('returns Completed for completed goal', () => {
      expect(getGoalStatusLabel(makeGoal({isCompleted: true}), now)).toBe('Completed');
    });

    it('returns Overdue for past-deadline active goal', () => {
      expect(getGoalStatusLabel(makeGoal({deadline: now - DAY}), now)).toBe('Overdue');
    });

    it('returns In Progress for active goal', () => {
      expect(getGoalStatusLabel(makeGoal(), now)).toBe('In Progress');
    });
  });
});
