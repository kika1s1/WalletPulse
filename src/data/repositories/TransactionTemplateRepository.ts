import type {Database} from '@nozbe/watermelondb';
import type {ITransactionTemplateRepository} from '@domain/repositories/ITransactionTemplateRepository';
import type {TransactionTemplate, TemplateInput} from '@domain/usecases/quick-action-templates';
import type TransactionTemplateModel from '@data/database/models/TransactionTemplateModel';
import {toDomain, toRaw} from '@data/mappers/template-mapper';

export class TransactionTemplateRepository implements ITransactionTemplateRepository {
  constructor(private db: Database) {}

  async findAll(): Promise<TransactionTemplate[]> {
    const records = await this.db
      .get<TransactionTemplateModel>('transaction_templates')
      .query()
      .fetch();
    return records.map((r) =>
      toDomain({
        id: r.id,
        name: r.name,
        amount: r.amount,
        currency: r.currency,
        type: r.type,
        categoryId: r.categoryId,
        description: r.description,
        merchant: r.merchant,
        usageCount: r.usageCount,
        icon: r.icon,
        color: r.color,
        tags: r.tags,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt.getTime(),
        updatedAt: r.updatedAt.getTime(),
      }),
    );
  }

  async create(input: TransactionTemplate): Promise<void> {
    const raw = toRaw(input);
    await this.db.write(async () => {
      await this.db
        .get<TransactionTemplateModel>('transaction_templates')
        .create((rec) => {
          rec._raw.id = input.id;
          rec.name = raw.name;
          rec.amount = raw.amount;
          rec.currency = raw.currency;
          rec.type = raw.type;
          rec.categoryId = raw.categoryId;
          rec.description = raw.description;
          rec.merchant = raw.merchant;
          rec.usageCount = 0;
          rec.icon = raw.icon;
          rec.color = raw.color;
          rec.tags = raw.tags;
          rec.sortOrder = raw.sortOrder;
        });
    });
  }

  async update(id: string, input: Partial<TemplateInput>): Promise<void> {
    const record = await this.db
      .get<TransactionTemplateModel>('transaction_templates')
      .find(id);
    await this.db.write(async () => {
      await record.update((rec) => {
        if (input.name !== undefined) rec.name = input.name;
        if (input.icon !== undefined) rec.icon = input.icon;
        if (input.color !== undefined) rec.color = input.color;
        if (input.type !== undefined) rec.type = input.type;
        if (input.amount !== undefined) rec.amount = input.amount;
        if (input.currency !== undefined) rec.currency = input.currency;
        if (input.description !== undefined) rec.description = input.description;
        if (input.merchant !== undefined) rec.merchant = input.merchant;
        if (input.tags !== undefined) rec.tags = JSON.stringify(input.tags);
        if (input.categoryId !== undefined) rec.categoryId = input.categoryId;
      });
    });
  }

  async delete(id: string): Promise<void> {
    const record = await this.db
      .get<TransactionTemplateModel>('transaction_templates')
      .find(id);
    await this.db.write(async () => {
      await record.markAsDeleted();
    });
  }

  async incrementUsageCount(id: string): Promise<void> {
    const record = await this.db
      .get<TransactionTemplateModel>('transaction_templates')
      .find(id);
    await this.db.write(async () => {
      await record.update((rec) => {
        rec.usageCount = rec.usageCount + 1;
      });
    });
  }
}
