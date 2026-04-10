import {createWallet, type Wallet} from '@domain/entities/Wallet';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';

export type UpdateWalletFields = {
  name: string;
  currency: string;
  icon: string;
  color: string;
};

export type UpdateWalletDeps = {
  walletRepo: IWalletRepository;
};

export function makeUpdateWallet(deps: UpdateWalletDeps) {
  return async function execute(
    id: string,
    fields: UpdateWalletFields,
  ): Promise<Wallet> {
    const existing = await deps.walletRepo.findById(id);
    if (existing === null) {
      throw new Error('Wallet not found');
    }

    const next = createWallet({
      id: existing.id,
      name: fields.name,
      currency: fields.currency,
      balance: existing.balance,
      isActive: existing.isActive,
      icon: fields.icon,
      color: fields.color,
      sortOrder: existing.sortOrder,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    });

    await deps.walletRepo.update(next);
    return next;
  };
}
