import {Database, Q} from '@nozbe/watermelondb';
import type {Wallet} from '@domain/entities/Wallet';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import WalletModel from '@data/database/models/WalletModel';
import {toDomain, toRaw} from '@data/mappers/wallet-mapper';

export class WalletRepository implements IWalletRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private get collection() {
    return this.db.get<WalletModel>('wallets');
  }

  private modelToDomain(model: WalletModel): Wallet {
    return toDomain({
      id: model.id,
      currency: model.currency,
      name: model.name,
      balance: model.balance,
      isActive: model.isActive,
      icon: model.icon,
      color: model.color,
      sortOrder: model.sortOrder,
      createdAt: model.createdAt?.getTime() ?? Date.now(),
      updatedAt: model.updatedAt?.getTime() ?? Date.now(),
    });
  }

  private applyRawToRecord(record: WalletModel, raw: ReturnType<typeof toRaw>): void {
    record.currency = raw.currency;
    record.name = raw.name;
    record.balance = raw.balance;
    record.isActive = raw.isActive;
    record.icon = raw.icon;
    record.color = raw.color;
    record.sortOrder = raw.sortOrder;
    record._setRaw('created_at', raw.createdAt);
    record._setRaw('updated_at', raw.updatedAt);
  }

  async findById(id: string): Promise<Wallet | null> {
    try {
      const model = await this.collection.find(id);
      return this.modelToDomain(model);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Wallet[]> {
    const models = await this.collection.query().fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findActive(): Promise<Wallet[]> {
    const models = await this.collection.query(Q.where('is_active', true)).fetch();
    return models.map((m) => this.modelToDomain(m));
  }

  async findByCurrency(currency: string): Promise<Wallet | null> {
    const models = await this.collection.query(Q.where('currency', currency)).fetch();
    const first = models[0];
    return first ? this.modelToDomain(first) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    const raw = toRaw(wallet);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = wallet.id;
        this.applyRawToRecord(record, raw);
      });
    });
  }

  async update(wallet: Wallet): Promise<void> {
    const raw = toRaw(wallet);
    await this.db.write(async () => {
      const model = await this.collection.find(wallet.id);
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

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await this.db.write(async () => {
      const model = await this.collection.find(id);
      await model.update((rec) => {
        rec.balance = newBalance;
      });
    });
  }
}
