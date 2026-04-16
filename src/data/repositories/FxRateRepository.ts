import type {SupabaseClient} from '@supabase/supabase-js';
import type {FxRate} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): FxRate {
  return {
    id: row.id as string,
    baseCurrency: row.base_currency as string,
    targetCurrency: row.target_currency as string,
    rate: Number(row.rate),
    fetchedAt: Number(row.fetched_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class FxRateRepository implements IFxRateRepository {
  constructor(private supabase: SupabaseClient) {}

  async findRate(baseCurrency: string, targetCurrency: string): Promise<FxRate | null> {
    const {data} = await this.supabase
      .from('fx_rates').select('*')
      .eq('base_currency', baseCurrency).eq('target_currency', targetCurrency)
      .limit(1).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAllByBase(baseCurrency: string): Promise<FxRate[]> {
    const {data, error} = await this.supabase
      .from('fx_rates').select('*')
      .eq('base_currency', baseCurrency);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findLatest(): Promise<FxRate[]> {
    const {data, error} = await this.supabase
      .from('fx_rates').select('*')
      .order('fetched_at', {ascending: false});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async saveRate(rate: FxRate): Promise<void> {
    const {error} = await this.supabase.from('fx_rates').insert({
      id: rate.id, base_currency: rate.baseCurrency,
      target_currency: rate.targetCurrency, rate: rate.rate,
      fetched_at: rate.fetchedAt,
      created_at: rate.createdAt, updated_at: rate.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async saveBatch(rates: FxRate[]): Promise<void> {
    if (rates.length === 0) { return; }
    const rows = rates.map(r => ({
      id: r.id, base_currency: r.baseCurrency,
      target_currency: r.targetCurrency, rate: r.rate,
      fetched_at: r.fetchedAt,
      created_at: r.createdAt, updated_at: r.updatedAt,
    }));
    const {error} = await this.supabase.from('fx_rates').insert(rows);
    if (error) { throw new Error(error.message); }
  }

  async deleteStale(olderThanMs: number): Promise<void> {
    const threshold = Date.now() - olderThanMs;
    await this.supabase.from('fx_rates').delete()
      .lt('fetched_at', threshold);
  }
}
