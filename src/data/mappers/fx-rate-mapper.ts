import type {FxRate} from '@domain/entities/FxRate';

export type FxRateRaw = {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  fetchedAt: number;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: FxRateRaw): FxRate {
  return {
    id: raw.id,
    baseCurrency: raw.baseCurrency,
    targetCurrency: raw.targetCurrency,
    rate: raw.rate,
    fetchedAt: raw.fetchedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: FxRate): Omit<FxRateRaw, 'id'> {
  return {
    baseCurrency: entity.baseCurrency,
    targetCurrency: entity.targetCurrency,
    rate: entity.rate,
    fetchedAt: entity.fetchedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
