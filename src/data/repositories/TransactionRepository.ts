import {Database, Q} from '@nozbe/watermelondb';
import type {Where} from '@nozbe/watermelondb/QueryDescription';
import type {Transaction} from '@domain/entities/Transaction';
import type {
  ITransactionRepository,
  TransactionFilter,
  TransactionSort,
  TransactionSortField,
} from '@domain/repositories/ITransactionRepository';
import TransactionModel from '@data/database/models/TransactionModel';
import {toDomain, toRaw} from '@data/mappers/transaction-mapper';

function sortColumnForField(field: TransactionSortField): string {
  switch (field) {
    case 'transactionDate':
      return 'transaction_date';
    case 'amount':
      return 'amount';
    case 'createdAt':
      return 'created_at';
    default: {
      const _exhaustive: never = field;
      return _exhaustive;
    }
  }
}

export class TransactionRepository implements ITransactionRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get collection() {
    return this.db.get<TransactionModel>('transactions');
  }

  private buildQueryConditions(filter?: TransactionFilter): Where[] {
    if (!filter) {
      return [];
    }
    const conditions: Where[] = [];

    if (filter.walletId !== undefined) {
      conditions.push(Q.where('wallet_id', filter.walletId));
    }
    if (filter.categoryId !== undefined) {
      conditions.push(Q.where('category_id', filter.categoryId));
    }
    if (filter.type !== undefined) {
      conditions.push(Q.where('type', filter.type));
    }
    if (filter.source !== undefined) {
      conditions.push(Q.where('source', filter.source));
    }
    if (filter.currency !== undefined) {
      conditions.push(Q.where('currency', filter.currency));
    }
    if (filter.merchant !== undefined) {
      conditions.push(Q.where('merchant', filter.merchant));
    }
    if (filter.dateRange !== undefined) {
      conditions.push(
        Q.where(
          'transaction_date',
          Q.between(filter.dateRange.startMs, filter.dateRange.endMs),
        ),
      );
    }
    if (filter.minAmount !== undefined) {
      conditions.push(Q.where('amount', Q.gte(filter.minAmount)));
    }
    if (filter.maxAmount !== undefined) {
      conditions.push(Q.where('amount', Q.lte(filter.maxAmount)));
    }
    if (filter.searchQuery !== undefined && filter.searchQuery.trim() !== '') {
      const safe = Q.sanitizeLikeString(filter.searchQuery.trim());
      conditions.push(Q.where('description', Q.like(`%${safe}%`)));
    }
    if (filter.tags !== undefined && filter.tags.length > 0) {
      for (const tag of filter.tags) {
        const safe = Q.sanitizeLikeString(tag);
        conditions.push(Q.where('tags', Q.like(`%${safe}%`)));
      }
    }

    return conditions;
  }

  private whereClauseFromConditions(conditions: Where[]): Where[] {
    if (conditions.length === 0) {
      return [];
    }
    if (conditions.length === 1) {
      return [conditions[0]];
    }
    return [Q.and(...conditions)];
  }

  private modelToDomain(model: TransactionModel): Transaction {
    return toDomain({
      id: model.id,
      walletId: model.walletId,
      categoryId: model.categoryId,
      amount: model.amount,
      currency: model.currency,
      type: model.type,
      description: model.description,
      merchant: model.merchant,
      source: model.source,
      sourceHash: model.sourceHash,
      tags: model.tags,
      receiptUri: model.receiptUri,
      isRecurring: model.isRecurring,
      recurrenceRule: model.recurrenceRule,
      confidence: model.confidence,
      locationLat: model.locationLat,
      locationLng: model.locationLng,
      locationName: model.locationName,
      notes: model.notes,
      isTemplate: model.isTemplate,
      templateName: model.templateName,
      transactionDate: model.transactionDate,
      createdAt: model.createdAt?.getTime() ?? Date.now(),
      updatedAt: model.updatedAt?.getTime() ?? Date.now(),
    });
  }

  private applyRawToRecord(record: TransactionModel, raw: ReturnType<typeof toRaw>): void {
    record.walletId = raw.walletId;
    record.categoryId = raw.categoryId;
    record.amount = raw.amount;
    record.currency = raw.currency;
    record.type = raw.type;
    record.description = raw.description;
    record.merchant = raw.merchant;
    record.source = raw.source;
    record.sourceHash = raw.sourceHash;
    record.tags = raw.tags;
    record.receiptUri = raw.receiptUri;
    record.isRecurring = raw.isRecurring;
    record.recurrenceRule = raw.recurrenceRule;
    record.confidence = raw.confidence;
    record.locationLat = raw.locationLat;
    record.locationLng = raw.locationLng;
    record.locationName = raw.locationName;
    record.notes = raw.notes;
    record.isTemplate = raw.isTemplate;
    record.templateName = raw.templateName;
    record.transactionDate = raw.transactionDate;
    record._setRaw('created_at', raw.createdAt);
    record._setRaw('updated_at', raw.updatedAt);
  }

  async findById(id: string): Promise<Transaction | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(
    filter?: TransactionFilter,
    sort?: TransactionSort,
  ): Promise<Transaction[]> {
    const conditions = this.buildQueryConditions(filter);
    const wherePart = this.whereClauseFromConditions(conditions);
    const query =
      sort !== undefined
        ? this.collection.query(
            ...wherePart,
            Q.sortBy(
              sortColumnForField(sort.field),
              sort.direction === 'desc' ? Q.desc : Q.asc,
            ),
          )
        : wherePart.length > 0
          ? this.collection.query(...wherePart)
          : this.collection.query();

    const models = await query.fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByWalletId(walletId: string): Promise<Transaction[]> {
    const models = await this.collection
      .query(Q.where('wallet_id', walletId))
      .fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByCategoryId(categoryId: string): Promise<Transaction[]> {
    const models = await this.collection
      .query(Q.where('category_id', categoryId))
      .fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findBySourceHash(hash: string): Promise<Transaction | null> {
    const models = await this.collection
      .query(Q.where('source_hash', hash))
      .fetch();
    const first = models[0];
    return first ? this.modelToDomain(first) : null;
  }

  async findRecent(limit: number): Promise<Transaction[]> {
    const models = await this.collection
      .query(Q.sortBy('transaction_date', Q.desc), Q.take(limit))
      .fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async save(transaction: Transaction): Promise<void> {
    const raw = toRaw(transaction);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = transaction.id;
        this.applyRawToRecord(record, raw);
      });
    });
  }

  async update(transaction: Transaction): Promise<void> {
    const raw = toRaw(transaction);
    await this.db.write(async () => {
      const model = await this.collection.find(transaction.id);
      await model.update((rec) => {
        this.applyRawToRecord(rec, raw);
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

  async countByFilter(filter: TransactionFilter): Promise<number> {
    const conditions = this.buildQueryConditions(filter);
    const wherePart = this.whereClauseFromConditions(conditions);
    const query =
      wherePart.length > 0
        ? this.collection.query(...wherePart)
        : this.collection.query();
    return query.fetchCount();
  }

  async sumByFilter(filter: TransactionFilter): Promise<number> {
    const conditions = this.buildQueryConditions(filter);
    const wherePart = this.whereClauseFromConditions(conditions);
    const query =
      wherePart.length > 0
        ? this.collection.query(...wherePart)
        : this.collection.query();
    const models = await query.fetch();
    return models.reduce((sum, m) => sum + m.amount, 0);
  }
}
