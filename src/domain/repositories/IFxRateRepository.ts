import type {FxRate} from '@domain/entities/FxRate';

export interface IFxRateRepository {
  findRate(baseCurrency: string, targetCurrency: string): Promise<FxRate | null>;
  findAllByBase(baseCurrency: string): Promise<FxRate[]>;
  findLatest(): Promise<FxRate[]>;
  saveRate(rate: FxRate): Promise<void>;
  saveBatch(rates: FxRate[]): Promise<void>;
  deleteStale(olderThanMs: number): Promise<void>;
}
