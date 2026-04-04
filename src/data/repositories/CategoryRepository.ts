import {Database, Q} from '@nozbe/watermelondb';
import type {Category} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';
import CategoryModel from '@data/database/models/CategoryModel';
import {toDomain, toRaw} from '@data/mappers/category-mapper';

export class CategoryRepository implements ICategoryRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get collection() {
    return this.db.get<CategoryModel>('categories');
  }

  private modelToDomain(model: CategoryModel): Category {
    return toDomain({
      id: model.id,
      name: model.name,
      icon: model.icon,
      color: model.color,
      type: model.type,
      parentId: model.parentId,
      isDefault: model.isDefault,
      isArchived: model.isArchived,
      sortOrder: model.sortOrder,
      createdAt: model.createdAt?.getTime() ?? Date.now(),
      updatedAt: model.updatedAt?.getTime() ?? Date.now(),
    });
  }

  private applyRawToRecord(record: CategoryModel, raw: ReturnType<typeof toRaw>): void {
    record.name = raw.name;
    record.icon = raw.icon;
    record.color = raw.color;
    record.type = raw.type;
    record.parentId = raw.parentId;
    record.isDefault = raw.isDefault;
    record.isArchived = raw.isArchived;
    record.sortOrder = raw.sortOrder;
    record._setRaw('created_at', raw.createdAt);
    record._setRaw('updated_at', raw.updatedAt);
  }

  async findById(id: string): Promise<Category | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Category[]> {
    const models = await this.collection.query().fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByType(type: 'expense' | 'income' | 'both'): Promise<Category[]> {
    const query =
      type === 'both'
        ? this.collection.query(Q.where('type', 'both'))
        : this.collection.query(Q.or(Q.where('type', type), Q.where('type', 'both')));
    const models = await query.fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findDefaults(): Promise<Category[]> {
    const models = await this.collection.query(Q.where('is_default', true)).fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findSubcategories(parentId: string): Promise<Category[]> {
    const models = await this.collection.query(Q.where('parent_id', parentId)).fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByName(name: string): Promise<Category | null> {
    const models = await this.collection.query(Q.where('name', name)).fetch();
    const first = models[0];
    return first ? this.modelToDomain(first) : null;
  }

  async save(category: Category): Promise<void> {
    const raw = toRaw(category);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = category.id;
        this.applyRawToRecord(record, raw);
      });
    });
  }

  async update(category: Category): Promise<void> {
    const raw = toRaw(category);
    await this.db.write(async () => {
      const model = await this.collection.find(category.id);
      await model.update((rec) => {
        this.applyRawToRecord(rec, raw);
      });
    });
  }

  async archive(id: string): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((rec) => {
        rec.isArchived = true;
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.write(async () => {
      try {
        const model = await this.collection.find(id);
        await model.markAsDeleted();
      } catch {
        /* record missing */
      }
    });
  }
}
