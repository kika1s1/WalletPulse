import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {NotificationLog} from '@domain/entities/NotificationLog';
import type {INotificationLogRepository} from '@domain/repositories/INotificationLogRepository';
import {
  toDomain as notificationLogToDomain,
  toRaw as notificationLogToRaw,
  type NotificationLogRaw,
} from '@data/mappers/notification-log-mapper';
import NotificationLogModel from '@data/database/models/NotificationLogModel';

export class NotificationLogRepository implements INotificationLogRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<NotificationLogModel>('notification_logs');
  }

  private modelToDomain(model: NotificationLogModel): NotificationLog {
    const tid = model._getRaw('transaction_id') as string | undefined;
    const raw: NotificationLogRaw = {
      id: model.id,
      packageName: model.packageName,
      title: model.title,
      body: model.body,
      parsedSuccessfully: model.parsedSuccessfully,
      parseResult: model.parseResult,
      transactionId: tid ?? null,
      receivedAt: model.receivedAt,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return notificationLogToDomain(raw);
  }

  async findById(id: string): Promise<NotificationLog | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<NotificationLog[]> {
    const rows = await this.collection.query().fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findRecent(limit: number): Promise<NotificationLog[]> {
    const rows = await this.collection
      .query(Q.sortBy('received_at', Q.desc), Q.take(limit))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findByPackageName(packageName: string): Promise<NotificationLog[]> {
    const rows = await this.collection
      .query(Q.where('package_name', packageName))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findFailed(): Promise<NotificationLog[]> {
    const rows = await this.collection
      .query(Q.where('parsed_successfully', false))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async save(log: NotificationLog): Promise<void> {
    const raw = notificationLogToRaw(log);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = log.id;
        record.packageName = raw.packageName;
        record.title = raw.title;
        record.body = raw.body;
        record.parsedSuccessfully = raw.parsedSuccessfully;
        record.parseResult = raw.parseResult;
        record._setRaw('transaction_id', raw.transactionId);
        record.receivedAt = raw.receivedAt;
        record._setRaw('created_at', raw.createdAt);
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

  async deleteOlderThan(timestampMs: number): Promise<void> {
    await this.db.write(async () => {
      const old = await this.collection
        .query(Q.where('received_at', Q.lt(timestampMs)))
        .fetch();
      const batch = old.map((m) => m.prepareMarkAsDeleted());
      if (batch.length > 0) {
        await this.db.batch(...batch);
      }
    });
  }
}
