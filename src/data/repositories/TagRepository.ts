import {Database, Q} from '@nozbe/watermelondb';
import type {Tag} from '@domain/entities/Tag';
import type {ITagRepository} from '@domain/repositories/ITagRepository';
import TagModel from '@data/database/models/TagModel';
import {toDomain, toRaw} from '@data/mappers/tag-mapper';

export class TagRepository implements ITagRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get collection() {
    return this.db.get<TagModel>('tags');
  }

  private modelToDomain(model: TagModel): Tag {
    return toDomain({
      id: model.id,
      name: model.name,
      color: model.color ?? null,
      usageCount: model.usageCount,
      createdAt: model.createdAt?.getTime() ?? Date.now(),
      updatedAt: model.updatedAt?.getTime() ?? Date.now(),
    });
  }

  private applyRawToRecord(record: TagModel, raw: ReturnType<typeof toRaw>): void {
    record.name = raw.name;
    record.color = raw.color;
    record.usageCount = raw.usageCount;
    record._setRaw('created_at', raw.createdAt);
    record._setRaw('updated_at', raw.updatedAt);
  }

  async findAll(): Promise<Tag[]> {
    const models = await this.collection.query(Q.sortBy('name', Q.asc)).fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByName(name: string): Promise<Tag | null> {
    const models = await this.collection.query(Q.where('name', name)).fetch();
    const first = models[0];
    return first ? this.modelToDomain(first) : null;
  }

  async save(tag: Tag): Promise<void> {
    const raw = toRaw(tag);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = tag.id;
        this.applyRawToRecord(record, raw);
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.write(async () => {
      try {
        const model = await this.collection.find(id);
        await model.markAsDeleted();
      } catch {
        // already removed
      }
    });
  }
}
