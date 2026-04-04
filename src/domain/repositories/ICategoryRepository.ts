import type {Category} from '@domain/entities/Category';

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  findByType(type: 'expense' | 'income' | 'both'): Promise<Category[]>;
  findDefaults(): Promise<Category[]>;
  findSubcategories(parentId: string): Promise<Category[]>;
  findByName(name: string): Promise<Category | null>;
  save(category: Category): Promise<void>;
  update(category: Category): Promise<void>;
  archive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
