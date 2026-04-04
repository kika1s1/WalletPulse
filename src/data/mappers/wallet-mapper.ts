import type {Wallet} from '@domain/entities/Wallet';

export type WalletRaw = {
  id: string;
  currency: string;
  name: string;
  balance: number;
  isActive: boolean;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export function toDomain(raw: WalletRaw): Wallet {
  return {
    id: raw.id,
    currency: raw.currency,
    name: raw.name,
    balance: raw.balance,
    isActive: raw.isActive,
    icon: raw.icon,
    color: raw.color,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toRaw(entity: Wallet): Omit<WalletRaw, 'id'> {
  return {
    currency: entity.currency,
    name: entity.name,
    balance: entity.balance,
    isActive: entity.isActive,
    icon: entity.icon,
    color: entity.color,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
