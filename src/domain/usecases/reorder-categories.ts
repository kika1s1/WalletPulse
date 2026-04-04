import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import type {Category} from '@domain/entities/Category';

export type MakeReorderCategoriesDeps = {
  categoryRepo: ICategoryRepository;
};

export function makeReorderCategories({categoryRepo}: MakeReorderCategoriesDeps) {
  return async (orderedIds: string[]): Promise<void> => {
    const all = await categoryRepo.findAll();
    const map = new Map(all.map((c) => [c.id, c]));

    for (let i = 0; i < orderedIds.length; i++) {
      const cat = map.get(orderedIds[i]);
      if (cat && cat.sortOrder !== i) {
        await categoryRepo.update({
          ...cat,
          sortOrder: i,
          updatedAt: Date.now(),
        });
      }
    }
  };
}
