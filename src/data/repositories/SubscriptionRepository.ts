import type {SupabaseClient} from '@supabase/supabase-js';
import type {BillingCycle, Subscription} from '@domain/entities/Subscription';
import type {ISubscriptionRepository} from '@domain/repositories/ISubscriptionRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Subscription {
  return {
    id: row.id as string,
    name: row.name as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    billingCycle: row.billing_cycle as BillingCycle,
    nextDueDate: Number(row.next_due_date),
    categoryId: row.category_id as string,
    isActive: row.is_active as boolean,
    cancelledAt: row.cancelled_at !== null && row.cancelled_at !== undefined ? Number(row.cancelled_at) : undefined,
    icon: row.icon as string,
    color: row.color as string,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<Subscription | null> {
    const {data} = await this.supabase
      .from('subscriptions').select('*')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<Subscription[]> {
    const {data, error} = await this.supabase
      .from('subscriptions').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findActive(): Promise<Subscription[]> {
    const {data, error} = await this.supabase
      .from('subscriptions').select('*')
      .eq('user_id', this.userId).eq('is_active', true);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findCancelled(): Promise<Subscription[]> {
    const {data, error} = await this.supabase
      .from('subscriptions').select('*')
      .eq('user_id', this.userId).eq('is_active', false);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(subscription: Subscription): Promise<void> {
    const {error} = await this.supabase.from('subscriptions').insert({
      id: subscription.id, user_id: this.userId,
      name: subscription.name, amount: subscription.amount,
      currency: subscription.currency, billing_cycle: subscription.billingCycle,
      next_due_date: subscription.nextDueDate, category_id: subscription.categoryId,
      is_active: subscription.isActive, cancelled_at: subscription.cancelledAt ?? null,
      icon: subscription.icon, color: subscription.color,
      created_at: subscription.createdAt, updated_at: subscription.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(subscription: Subscription): Promise<void> {
    const {error} = await this.supabase.from('subscriptions').update({
      name: subscription.name, amount: subscription.amount,
      currency: subscription.currency, billing_cycle: subscription.billingCycle,
      next_due_date: subscription.nextDueDate, category_id: subscription.categoryId,
      is_active: subscription.isActive, cancelled_at: subscription.cancelledAt ?? null,
      icon: subscription.icon, color: subscription.color,
      updated_at: subscription.updatedAt,
    }).eq('id', subscription.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async cancel(id: string, cancelledAt: number): Promise<void> {
    const {error} = await this.supabase.from('subscriptions').update({
      is_active: false, cancelled_at: cancelledAt, updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('subscriptions').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
