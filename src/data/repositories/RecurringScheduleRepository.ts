import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  Cadence,
  RecurringSchedule,
  RecurringScheduleType,
} from '@domain/entities/RecurringSchedule';
import type {IRecurringScheduleRepository} from '@domain/repositories/IRecurringScheduleRepository';

type Row = Record<string, unknown>;

function toTagArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw !== 'string' || raw === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function rowToDomain(row: Row): RecurringSchedule {
  return {
    id: row.id as string,
    templateTransactionId: row.template_transaction_id as string,
    walletId: row.wallet_id as string,
    categoryId: row.category_id as string,
    type: row.type as RecurringScheduleType,
    amount: Number(row.amount),
    currency: row.currency as string,
    merchant: (row.merchant as string) ?? '',
    description: (row.description as string) ?? '',
    tags: toTagArray(row.tags),
    cadence: row.cadence as Cadence,
    nextDueDate: Number(row.next_due_date),
    isActive: row.is_active as boolean,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class RecurringScheduleRepository implements IRecurringScheduleRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  private toRow(s: RecurringSchedule) {
    return {
      id: s.id,
      user_id: this.userId,
      template_transaction_id: s.templateTransactionId,
      wallet_id: s.walletId,
      category_id: s.categoryId,
      type: s.type,
      amount: s.amount,
      currency: s.currency,
      merchant: s.merchant,
      description: s.description,
      tags: s.tags,
      cadence: s.cadence,
      next_due_date: s.nextDueDate,
      is_active: s.isActive,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    };
  }

  async findById(id: string): Promise<RecurringSchedule | null> {
    const {data} = await this.supabase
      .from('recurring_schedules').select('*')
      .eq('id', id).eq('user_id', this.userId)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findByTemplateTransactionId(templateTransactionId: string): Promise<RecurringSchedule | null> {
    const {data} = await this.supabase
      .from('recurring_schedules').select('*')
      .eq('user_id', this.userId)
      .eq('template_transaction_id', templateTransactionId)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findActive(): Promise<RecurringSchedule[]> {
    const {data, error} = await this.supabase
      .from('recurring_schedules').select('*')
      .eq('user_id', this.userId).eq('is_active', true)
      .order('next_due_date', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(schedule: RecurringSchedule): Promise<void> {
    const {error} = await this.supabase
      .from('recurring_schedules').insert(this.toRow(schedule));
    if (error) { throw new Error(error.message); }
  }

  async update(schedule: RecurringSchedule): Promise<void> {
    const row = this.toRow(schedule);
    const {id: _id, user_id: _uid, created_at: _created, ...updates} = row;
    const {error} = await this.supabase
      .from('recurring_schedules').update(updates)
      .eq('id', schedule.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async deactivate(id: string, updatedAt: number): Promise<void> {
    const {error} = await this.supabase
      .from('recurring_schedules').update({is_active: false, updated_at: updatedAt})
      .eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('recurring_schedules').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
