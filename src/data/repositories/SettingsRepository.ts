import type {SupabaseClient} from '@supabase/supabase-js';
import type {ISettingsRepository} from '@domain/repositories/ISettingsRepository';

export class SettingsRepository implements ISettingsRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async get(key: string): Promise<string | null> {
    const {data} = await this.supabase
      .from('app_settings').select('value')
      .eq('user_id', this.userId).eq('key', key)
      .maybeSingle();
    return data ? (data.value as string) : null;
  }

  async set(key: string, value: string): Promise<void> {
    const now = Date.now();
    const {data: existing} = await this.supabase
      .from('app_settings').select('id')
      .eq('user_id', this.userId).eq('key', key)
      .maybeSingle();

    if (existing) {
      await this.supabase.from('app_settings').update({
        value, updated_at: now,
      }).eq('user_id', this.userId).eq('key', key);
    } else {
      await this.supabase.from('app_settings').insert({
        user_id: this.userId, key, value,
        created_at: now, updated_at: now,
      });
    }
  }

  async getNumber(key: string): Promise<number | null> {
    const s = await this.get(key);
    if (s === null) { return null; }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.set(key, String(value));
  }

  async getBoolean(key: string): Promise<boolean | null> {
    const s = await this.get(key);
    if (s === null) { return null; }
    return s === 'true';
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.set(key, String(value));
  }

  async getJson<T>(key: string): Promise<T | null> {
    const s = await this.get(key);
    if (s === null) { return null; }
    try { return JSON.parse(s) as T; }
    catch { return null; }
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.supabase.from('app_settings').delete()
      .eq('user_id', this.userId).eq('key', key);
  }

  async getAllKeys(): Promise<string[]> {
    const {data, error} = await this.supabase
      .from('app_settings').select('key')
      .eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(r => r.key as string);
  }
}
