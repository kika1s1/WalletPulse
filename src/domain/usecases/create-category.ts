import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import {createCategory, type CreateCategoryInput, type Category} from '@domain/entities/Category';

export type MakeCreateCategoryDeps = {
  categoryRepo: ICategoryRepository;
};

export function makeCreateCategory({categoryRepo}: MakeCreateCategoryDeps) {
  return async (input: CreateCategoryInput): Promise<Category> => {
    const category = createCategory(input);

    const existing = await categoryRepo.findByName(category.name);
    if (existing && !existing.isArchived) {
      throw new Error('A category with this name already exists');
    }

    await categoryRepo.save(category);
    return category;
  };
}
