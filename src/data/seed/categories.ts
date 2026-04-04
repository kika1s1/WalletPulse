import {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import CategoryModel from '@data/database/models/CategoryModel';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';

export async function seedDefaultCategories(db: Database): Promise<void> {
  const collection = db.get<CategoryModel>('categories');

  const existingDefaults = await collection
    .query(Q.where('is_default', true))
    .fetchCount();

  if (existingDefaults > 0) {
    return;
  }

  await db.write(async () => {
    const batch = DEFAULT_CATEGORIES.map((cat, index) =>
      collection.prepareCreate((record) => {
        record.name = cat.name;
        record.icon = cat.icon;
        record.color = cat.color;
        record.type = cat.type;
        record.isDefault = true;
        record.isArchived = false;
        record.sortOrder = index;
      }),
    );
    await db.batch(...batch);
  });
}

export async function isCategorySeeded(db: Database): Promise<boolean> {
  const collection = db.get<CategoryModel>('categories');
  const count = await collection
    .query(Q.where('is_default', true))
    .fetchCount();
  return count > 0;
}
