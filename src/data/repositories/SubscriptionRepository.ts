import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {Subscription} from '@domain/entities/Subscription';
import type {ISubscriptionRepository} from '@domain/repositories/ISubscriptionRepository';
import {
  toDomain,
  toRaw,
  type SubscriptionRaw,
} from '@data/mappers/subscription-mapper';
import SubscriptionModel from '@data/database/models/SubscriptionModel';

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<SubscriptionModel>('subscriptions');
  }

  private modelToDomain(model: SubscriptionModel): Subscription {
    const raw: SubscriptionRaw = {
      id: model.id,
      name: model.name,
      amount: model.amount,
      currency: model.currency,
      billingCycle: model.billingCycle,
      nextDueDate: model.nextDueDate,
      categoryId: model.categoryId,
      isActive: model.isActive,
      cancelledAt: model.cancelledAt,
      icon: model.icon,
      color: model.color,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return toDomain(raw);
  }

  async findById(id: string): Promise<Subscription | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Subscription[]> {
    const rows = await this.collection.query().fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findActive(): Promise<Subscription[]> {
    const rows = await this.collection
      .query(Q.where('is_active', true))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findCancelled(): Promise<Subscription[]> {
    const rows = await this.collection
      .query(Q.where('is_active', false))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async save(subscription: Subscription): Promise<void> {
    const raw = toRaw(subscription);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = subscription.id;
        record.name = raw.name;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.billingCycle = raw.billingCycle;
        record.nextDueDate = raw.nextDueDate;
        record.categoryId = raw.categoryId;
        record.isActive = raw.isActive;
        record.cancelledAt = raw.cancelledAt;
        record.icon = raw.icon;
        record.color = raw.color;
        record._setRaw('created_at', raw.createdAt);
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async update(subscription: Subscription): Promise<void> {
    const raw = toRaw(subscription);
    await this.db.write(async () => {
      const model = await this.collection.find(subscription.id);
      await model.update((record) => {
        record.name = raw.name;
        record.amount = raw.amount;
        record.currency = raw.currency;
        record.billingCycle = raw.billingCycle;
        record.nextDueDate = raw.nextDueDate;
        record.categoryId = raw.categoryId;
        record.isActive = raw.isActive;
        record.cancelledAt = raw.cancelledAt;
        record.icon = raw.icon;
        record.color = raw.color;
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async cancel(id: string, cancelledAt: number): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((record) => {
        record.isActive = false;
        record.cancelledAt = cancelledAt;
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
