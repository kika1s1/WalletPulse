import {toDomain, toRaw, type WalletRaw} from '@data/mappers/wallet-mapper';
import type {Wallet} from '@domain/entities/Wallet';

describe('wallet-mapper', () => {
  const sampleEntity: Wallet = {
    id: 'w-1',
    currency: 'USD',
    name: 'Main',
    balance: 10_000,
    isActive: true,
    icon: 'wallet',
    color: '#112233',
    sortOrder: 0,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_100_000,
  };

  const sampleRaw: WalletRaw = {...sampleEntity};

  it('should convert raw to domain entity', () => {
    const entity = toDomain(sampleRaw);
    expect(entity).toEqual(sampleEntity);
  });

  it('should convert domain entity to raw', () => {
    const raw = toRaw(sampleEntity);
    expect(raw).toEqual({
      currency: sampleEntity.currency,
      name: sampleEntity.name,
      balance: sampleEntity.balance,
      isActive: sampleEntity.isActive,
      icon: sampleEntity.icon,
      color: sampleEntity.color,
      sortOrder: sampleEntity.sortOrder,
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
