import type {SupabaseClient} from '@supabase/supabase-js';
import type {BillRecurrence, BillReminder} from '@domain/entities/BillReminder';
import type {IBillReminderRepository} from '@domain/repositories/IBillReminderRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): BillReminder {
  return {
    id: row.id as string,
    name: row.name as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    dueDate: Number(row.due_date),
    recurrence: row.recurrence as BillRecurrence,
    categoryId: row.category_id as string,
    walletId: (row.wallet_id as string) ?? '',
    isPaid: row.is_paid as boolean,
    paidTransactionId: (row.paid_transaction_id as string | null) ?? undefined,
    remindDaysBefore: Number(row.remind_days_before),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class BillReminderRepository implements IBillReminderRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<BillReminder | null> {
    const {data} = await this.supabase
      .from('bill_reminders').select('*')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<BillReminder[]> {
    const {data, error} = await this.supabase
      .from('bill_reminders').select('*')
      .eq('user_id', this.userId).order('due_date', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findUnpaid(): Promise<BillReminder[]> {
    const {data, error} = await this.supabase
      .from('bill_reminders').select('*')
      .eq('user_id', this.userId).eq('is_paid', false)
      .order('due_date', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findPaid(): Promise<BillReminder[]> {
    const {data, error} = await this.supabase
      .from('bill_reminders').select('*')
      .eq('user_id', this.userId).eq('is_paid', true);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(bill: BillReminder): Promise<void> {
    const {error} = await this.supabase.from('bill_reminders').insert({
      id: bill.id, user_id: this.userId,
      name: bill.name, amount: bill.amount, currency: bill.currency,
      due_date: bill.dueDate, recurrence: bill.recurrence,
      category_id: bill.categoryId, wallet_id: bill.walletId,
      is_paid: bill.isPaid, paid_transaction_id: bill.paidTransactionId ?? null,
      remind_days_before: bill.remindDaysBefore,
      created_at: bill.createdAt, updated_at: bill.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(bill: BillReminder): Promise<void> {
    const {error} = await this.supabase.from('bill_reminders').update({
      name: bill.name, amount: bill.amount, currency: bill.currency,
      due_date: bill.dueDate, recurrence: bill.recurrence,
      category_id: bill.categoryId, wallet_id: bill.walletId,
      is_paid: bill.isPaid, paid_transaction_id: bill.paidTransactionId ?? null,
      remind_days_before: bill.remindDaysBefore, updated_at: bill.updatedAt,
    }).eq('id', bill.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async markPaid(id: string, paidTransactionId?: string): Promise<void> {
    const {error} = await this.supabase.from('bill_reminders').update({
      is_paid: true,
      paid_transaction_id: paidTransactionId ?? null,
      updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('bill_reminders').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
