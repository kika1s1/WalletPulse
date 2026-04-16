import type {SupabaseClient} from '@supabase/supabase-js';
import type {Wallet} from '@domain/entities/Wallet';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Wallet {
  return {
    id: row.id as string,
    currency: row.currency as string,
    name: row.name as string,
    balance: Number(row.balance),
    isActive: row.is_active as boolean,
    icon: row.icon as string,
    color: row.color as string,
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class WalletRepository implements IWalletRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<Wallet | null> {
    const {data} = await this.supabase
      .from('wallets').select('*')
      .eq('id', id).eq('user_id', this.userId)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<Wallet[]> {
    const {data, error} = await this.supabase
      .from('wallets').select('*')
      .eq('user_id', this.userId)
      .order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findActive(): Promise<Wallet[]> {
    const {data, error} = await this.supabase
      .from('wallets').select('*')
      .eq('user_id', this.userId).eq('is_active', true)
      .order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByCurrency(currency: string): Promise<Wallet | null> {
    const {data} = await this.supabase
      .from('wallets').select('*')
      .eq('user_id', this.userId).eq('currency', currency)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    const {error} = await this.supabase.from('wallets').insert({
      id: wallet.id,
      user_id: this.userId,
      currency: wallet.currency,
      name: wallet.name,
      balance: wallet.balance,
      is_active: wallet.isActive,
      icon: wallet.icon,
      color: wallet.color,
      sort_order: wallet.sortOrder,
      created_at: wallet.createdAt,
      updated_at: wallet.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(wallet: Wallet): Promise<void> {
    const {error} = await this.supabase.from('wallets').update({
      currency: wallet.currency,
      name: wallet.name,
      balance: wallet.balance,
      is_active: wallet.isActive,
      icon: wallet.icon,
      color: wallet.color,
      sort_order: wallet.sortOrder,
      updated_at: wallet.updatedAt,
    }).eq('id', wallet.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('wallets').delete()
      .eq('id', id).eq('user_id', this.userId);
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    const {error} = await this.supabase.from('wallets').update({
      balance: newBalance,
      updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }
}
