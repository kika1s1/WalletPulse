import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {FxRate} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import {
  toDomain as fxRateToDomain,
  toRaw as fxRateToRaw,
  type FxRateRaw,
} from '@data/mappers/fx-rate-mapper';
import FxRateModel from '@data/database/models/FxRateModel';

export class FxRateRepository implements IFxRateRepository {
  constructor(private readonly db: Database) {}

  private get collection() {
    return this.db.collections.get<FxRateModel>('fx_rates');
  }

  private modelToDomain(model: FxRateModel): FxRate {
    const raw: FxRateRaw = {
      id: model.id,
      baseCurrency: model.baseCurrency,
      targetCurrency: model.targetCurrency,
      rate: model.rate,
      fetchedAt: model.fetchedAt,
      createdAt: model.createdAt.getTime(),
      updatedAt: model.updatedAt.getTime(),
    };
    return fxRateToDomain(raw);
  }

  async findRate(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRate | null> {
    const rows = await this.collection
      .query(
        Q.where('base_currency', baseCurrency),
        Q.where('target_currency', targetCurrency),
        Q.take(1),
      )
      .fetch();
    const first = rows[0];
    return first ? this.modelToDomain(first) : null;
  }

  async findAllByBase(baseCurrency: string): Promise<FxRate[]> {
    const rows = await this.collection
      .query(Q.where('base_currency', baseCurrency))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async findLatest(): Promise<FxRate[]> {
    const rows = await this.collection
      .query(Q.sortBy('fetched_at', Q.desc))
      .fetch();
    return rows.map((m) => this.modelToDomain(m));
  }

  async saveRate(rate: FxRate): Promise<void> {
    const raw = fxRateToRaw(rate);
    await this.db.write(async () => {
      await this.collection.create((record) => {
        record._raw.id = rate.id;
        record.baseCurrency = raw.baseCurrency;
        record.targetCurrency = raw.targetCurrency;
        record.rate = raw.rate;
        record.fetchedAt = raw.fetchedAt;
        record._setRaw('created_at', raw.createdAt);
        record._setRaw('updated_at', raw.updatedAt);
      });
    });
  }

  async saveBatch(rates: FxRate[]): Promise<void> {
    await this.db.write(async () => {
      const batch = rates.map((rate) => {
        const raw = fxRateToRaw(rate);
        return this.collection.prepareCreate((record) => {
          record._raw.id = rate.id;
          record.baseCurrency = raw.baseCurrency;
          record.targetCurrency = raw.targetCurrency;
          record.rate = raw.rate;
          record.fetchedAt = raw.fetchedAt;
          record._setRaw('created_at', raw.createdAt);
          record._setRaw('updated_at', raw.updatedAt);
        });
      });
      await this.db.batch(...batch);
    });
  }

  async deleteStale(olderThanMs: number): Promise<void> {
    const threshold = Date.now() - olderThanMs;
    await this.db.write(async () => {
      const stale = await this.collection
        .query(Q.where('fetched_at', Q.lt(threshold)))
        .fetch();
      const batch = stale.map((m) => m.prepareMarkAsDeleted());
      if (batch.length > 0) {
        await this.db.batch(...batch);
      }
    });
  }
}
