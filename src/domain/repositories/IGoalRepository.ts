import type {Goal} from '@domain/entities/Goal';

export interface IGoalRepository {
  findById(id: string): Promise<Goal | null>;
  findAll(): Promise<Goal[]>;
  findActive(): Promise<Goal[]>;
  findCompleted(): Promise<Goal[]>;
  save(goal: Goal): Promise<void>;
  update(goal: Goal): Promise<void>;
  updateProgress(id: string, currentAmount: number): Promise<void>;
  markCompleted(id: string, completedAt: number): Promise<void>;
  delete(id: string): Promise<void>;
}
