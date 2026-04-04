import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {Category} from '@domain/entities/Category';

export type MakeUpdateCategoryDeps = {
  categoryRepo: ICategoryRepository;
};

export function makeUpdateCategory({categoryRepo}: MakeUpdateCategoryDeps) {
  return async (category: Category): Promise<Category> => {
    const existing = await categoryRepo.findById(category.id);
    if (!existing) {
      throw new Error('Category not found');
    }

    if (category.name !== existing.name) {
      const dup = await categoryRepo.findByName(category.name);
      if (dup && dup.id !== category.id && !dup.isArchived) {
        throw new Error('A category with this name already exists');
      }
    }

    const updated: Category = {
      ...category,
      updatedAt: Date.now(),
    };

    await categoryRepo.update(updated);
    return updated;
  };
}
