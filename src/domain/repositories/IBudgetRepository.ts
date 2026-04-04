import type {Budget} from '@domain/entities/Budget';

export interface IBudgetRepository {
  findById(id: string): Promise<Budget | null>;
  findAll(): Promise<Budget[]>;
  findActive(): Promise<Budget[]>;
  findByCategoryId(categoryId: string): Promise<Budget[]>;
  findActiveByCategoryId(categoryId: string): Promise<Budget | null>;
  findOverallBudget(): Promise<Budget | null>;
  save(budget: Budget): Promise<void>;
  update(budget: Budget): Promise<void>;
  delete(id: string): Promise<void>;
}
