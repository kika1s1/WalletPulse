import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {Goal} from '@domain/entities/Goal';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';
import {
  toDomain as goalToDomain,
  toRaw as goalToRaw,
  type GoalRaw,
} from '@data/mappers/goal-mapper';
import GoalModel from '@data/database/models/GoalModel';

export class GoalRepository implements IGoalRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<GoalModel>('goals');
  }

  private modelToDomain(model: GoalModel): Goal {
    const raw: GoalRaw = {
      id: model.id,
      name: model.name,
      targetAmount: model.targetAmount,
      currentAmount: model.currentAmount,
      currency: model.currency,
      deadline: model.deadline,
      icon: model.icon,
      color: model.color,
      category: model.category,
      isCompleted: model.isCompleted,
      completedAt: model.completedAt ?? null,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return goalToDomain(raw);
  }

  async findById(id: string): Promise<Goal | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Goal[]> {
    const rows = await this.collection.query().fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findActive(): Promise<Goal[]> {
    const rows = await this.collection
      .query(Q.where('is_completed', false))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findCompleted(): Promise<Goal[]> {
    const rows = await this.collection
      .query(Q.where('is_completed', true))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async save(goal: Goal): Promise<void> {
    const raw = goalToRaw(goal);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = goal.id;
        record.name = raw.name;
        record.targetAmount = raw.targetAmount;
        record.currentAmount = raw.currentAmount;
        record.currency = raw.currency;
        record.deadline = raw.deadline;
        record.icon = raw.icon;
        record.color = raw.color;
        record.category = raw.category;
        record.isCompleted = raw.isCompleted;
        record.completedAt = raw.completedAt;
        record._setRaw('created_at', raw.createdAt);
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async update(goal: Goal): Promise<void> {
    const raw = goalToRaw(goal);
    await this.db.write(async () => {
      const model = await this.collection.find(goal.id);
      await model.update((record) => {
        record.name = raw.name;
        record.targetAmount = raw.targetAmount;
        record.currentAmount = raw.currentAmount;
        record.currency = raw.currency;
        record.deadline = raw.deadline;
        record.icon = raw.icon;
        record.color = raw.color;
        record.category = raw.category;
        record.isCompleted = raw.isCompleted;
        record.completedAt = raw.completedAt;
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async updateProgress(id: string, currentAmount: number): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((record) => {
        record.currentAmount = currentAmount;
      });
    });
  }

  async markCompleted(id: string, completedAt: number): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((record) => {
        record.isCompleted = true;
        record.completedAt = completedAt;
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.write(async () => {
      try {
        const model = await this.collection.find(id);
        await model.markAsDeleted();
      } catch {
        /* not found */
      }
    });
  }
}
