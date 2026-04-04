import type {Wallet} from '@domain/entities/Wallet';

export interface IWalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findAll(): Promise<Wallet[]>;
  findActive(): Promise<Wallet[]>;
  findByCurrency(currency: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  update(wallet: Wallet): Promise<void>;
  delete(id: string): Promise<void>;
  updateBalance(id: string, newBalance: number): Promise<void>;
}
