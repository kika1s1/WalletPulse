import {toDomain, toRaw, type FxRateRaw} from '@data/mappers/fx-rate-mapper';
import type {FxRate} from '@domain/entities/FxRate';

describe('fx-rate-mapper', () => {
  const sampleEntity: FxRate = {
    id: 'fx-1',
    baseCurrency: 'USD',
    targetCurrency: 'ETB',
    rate: 57.5,
    fetchedAt: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: FxRateRaw = {...sampleEntity};

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity).toEqual(sampleEntity);
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw).toEqual({
      baseCurrency: sampleEntity.baseCurrency,
      targetCurrency: sampleEntity.targetCurrency,
      rate: sampleEntity.rate,
      fetchedAt: sampleEntity.fetchedAt,
      createdAt: sampleEntity.createdAt,
      updatedAt: sampleEntity.updatedAt,
    });
    expect(raw).not.toHaveProperty('id');
  });

  it('should handle round-trip conversion', () => {
    const raw = toRaw(sampleEntity);
    const entity = toDomain({id: sampleEntity.id, ...raw});
    expect(entity).toEqual(sampleEntity);
  });
});
