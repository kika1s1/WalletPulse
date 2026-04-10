import {
  createWallet,
  type CreateWalletInput,
  type Wallet,
} from '@domain/entities/Wallet';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';

export type CreateWalletDeps = {
  walletRepo: IWalletRepository;
};

export function makeCreateWallet(deps: CreateWalletDeps) {
  return async function execute(input: CreateWalletInput): Promise<Wallet> {
    const wallet = createWallet(input);
    await deps.walletRepo.save(wallet);
    return wallet;
  };
}
