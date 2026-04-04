import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {ISettingsRepository} from '@domain/repositories/ISettingsRepository';
import AppSettingsModel from '@data/database/models/AppSettingsModel';

export class SettingsRepository implements ISettingsRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<AppSettingsModel>('app_settings');
  }

  async get(key: string): Promise<string | null> {
    const rows = await this.collection
      .query(Q.where('key', key), Q.take(1))
      .fetch();
    const first = rows[0];
    return first ? first.value : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.write(async () => {
      const existing = await this.collection
        .query(Q.where('key', key), Q.take(1))
        .fetch();
      const row = existing[0];
      if (row) {
        await row.update((record) => {
          record.value = value;
        });
        return;
      }
      const now = Date.now();
      await this.collection.create((record) => {
        record.key = key;
        record.value = value;
        record._setRaw('created_at', now);
        record._setRaw('updated_at', now);
      });
    });
  }

  async getNumber(key: string): Promise<number | null> {
    const s = await this.get(key);
    if (s === null) {
      return null;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.set(key, String(value));
  }

  async getBoolean(key: string): Promise<boolean | null> {
    const s = await this.get(key);
    if (s === null) {
      return null;
    }
    return s === 'true';
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.set(key, String(value));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const s = await this.get(key);
    if (s === null) {
      return null;
    }
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.db.write(async () => {
      const rows = await this.collection
        .query(Q.where('key', key), Q.take(1))
        .fetch();
      const row = rows[0];
      if (row) {
        await row.markAsDeleted();
      }
    });
  }

  async getAllKeys(): Promise<string[]> {
    const rows = await this.collection.query().fetch();
    return rows.map((r) => r.key);
  }
}
