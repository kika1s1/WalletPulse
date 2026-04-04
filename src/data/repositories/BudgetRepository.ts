import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {Budget} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';
import {
  toDomain as budgetToDomain,
  toRaw as budgetToRaw,
  type BudgetRaw,
} from '@data/mappers/budget-mapper';
import BudgetModel from '@data/database/models/BudgetModel';

export class BudgetRepository implements IBudgetRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<BudgetModel>('budgets');
  }

  private modelToDomain(model: BudgetModel): Budget {
    const raw: BudgetRaw = {
      id: model.id,
      categoryId: model.categoryId,
      amount: model.amount,
      currency: model.currency,
      period: model.period,
      startDate: model.startDate,
      endDate: model.endDate,
      rollover: model.rollover,
      isActive: model.isActive,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return budgetToDomain(raw);
  }

  async findById(id: string): Promise<Budget | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Budget[]> {
    const rows = await this.collection.query().fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findActive(): Promise<Budget[]> {
    const rows = await this.collection
      .query(Q.where('is_active', true))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findByCategoryId(categoryId: string): Promise<Budget[]> {
    const rows = await this.collection
      .query(Q.where('category_id', categoryId))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findActiveByCategoryId(categoryId: string): Promise<Budget | null> {
    const rows = await this.collection
      .query(
        Q.where('is_active', true),
        Q.where('category_id', categoryId),
        Q.take(1),
      )
      .fetch();
    const first = rows[0];
    return first ? this.modelToDomain(first) : null;
  }

  async findOverallBudget(): Promise<Budget | null> {
    const rows = await this.collection
      .query(
        Q.where('is_active', true),
        Q.where('category_id', null),
        Q.take(1),
      )
      .fetch();
    const first = rows[0];
    return first ? this.modelToDomain(first) : null;
  }

  async save(budget: Budget): Promise<void> {
    const raw = budgetToRaw(budget);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = budget.id;
        record.categoryId = raw.categoryId;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.period = raw.period;
        record.startDate = raw.startDate;
        record.endDate = raw.endDate;
        record.rollover = raw.rollover;
        record.isActive = raw.isActive;
        record._setRaw('created_at', raw.createdAt);
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async update(budget: Budget): Promise<void> {
    const raw = budgetToRaw(budget);
    await this.db.write(async () => {
      const model = await this.collection.find(budget.id);
      await model.update((record) => {
        record.categoryId = raw.categoryId;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.period = raw.period;
        record.startDate = raw.startDate;
        record.endDate = raw.endDate;
        record.rollover = raw.rollover;
        record.isActive = raw.isActive;
        record._setRaw('updated_at', raw.updatedAt);
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
