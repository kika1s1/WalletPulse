import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {BillReminder} from '@domain/entities/BillReminder';
import type {IBillReminderRepository} from '@domain/repositories/IBillReminderRepository';
import {
  toDomain,
  toRaw,
  type BillReminderRaw,
} from '@data/mappers/bill-reminder-mapper';
import BillReminderModel from '@data/database/models/BillReminderModel';

export class BillReminderRepository implements IBillReminderRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<BillReminderModel>('bill_reminders');
  }

  private modelToDomain(model: BillReminderModel): BillReminder {
    const raw: BillReminderRaw = {
      id: model.id,
      name: model.name,
      amount: model.amount,
      currency: model.currency,
      dueDate: model.dueDate,
      recurrence: model.recurrence,
      categoryId: model.categoryId,
      isPaid: model.isPaid,
      paidTransactionId: model.paidTransactionId,
      remindDaysBefore: model.remindDaysBefore,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return toDomain(raw);
  }

  async findById(id: string): Promise<BillReminder | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<BillReminder[]> {
    const rows = await this.collection
      .query(Q.sortBy('due_date', Q.asc))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findUnpaid(): Promise<BillReminder[]> {
    const rows = await this.collection
      .query(Q.where('is_paid', false), Q.sortBy('due_date', Q.asc))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findPaid(): Promise<BillReminder[]> {
    const rows = await this.collection
      .query(Q.where('is_paid', true))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async save(bill: BillReminder): Promise<void> {
    const raw = toRaw(bill);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = bill.id;
        record.name = raw.name;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.dueDate = raw.dueDate;
        record.recurrence = raw.recurrence;
        record.categoryId = raw.categoryId;
        record.isPaid = raw.isPaid;
        record.paidTransactionId = raw.paidTransactionId;
        record.remindDaysBefore = raw.remindDaysBefore;
        record._setRaw('created_at', raw.createdAt);
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async update(bill: BillReminder): Promise<void> {
    const raw = toRaw(bill);
    await this.db.write(async () => {
      const model = await this.collection.find(bill.id);
      await model.update((record) => {
        record.name = raw.name;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.dueDate = raw.dueDate;
        record.recurrence = raw.recurrence;
        record.categoryId = raw.categoryId;
        record.isPaid = raw.isPaid;
        record.paidTransactionId = raw.paidTransactionId;
        record.remindDaysBefore = raw.remindDaysBefore;
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async markPaid(id: string, paidTransactionId?: string): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((record) => {
        record.isPaid = true;
        if (paidTransactionId) {
          record.paidTransactionId = paidTransactionId;
        }
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
