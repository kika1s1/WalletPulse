import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';

export type MakeArchiveCategoryDeps = {
  categoryRepo: ICategoryRepository;
};

export function makeArchiveCategory({categoryRepo}: MakeArchiveCategoryDeps) {
  return async (categoryId: string): Promise<void> => {
    const category = await categoryRepo.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
    if (category.isDefault) {
      throw new Error('Default categories cannot be archived');
    }
    await categoryRepo.archive(categoryId);
  };
}
