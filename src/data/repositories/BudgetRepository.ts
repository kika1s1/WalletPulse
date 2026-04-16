import type {SupabaseClient} from '@supabase/supabase-js';
import type {Budget, BudgetPeriod} from '@domain/entities/Budget';
import type {IBudgetRepository} from '@domain/repositories/IBudgetRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Budget {
  return {
    id: row.id as string,
    categoryId: (row.category_id as string | null) ?? null,
    amount: Number(row.amount),
    currency: row.currency as string,
    period: row.period as BudgetPeriod,
    startDate: Number(row.start_date),
    endDate: Number(row.end_date),
    rollover: row.rollover as boolean,
    isActive: row.is_active as boolean,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class BudgetRepository implements IBudgetRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<Budget | null> {
    const {data} = await this.supabase
      .from('budgets').select('*')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<Budget[]> {
    const {data, error} = await this.supabase
      .from('budgets').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findActive(): Promise<Budget[]> {
    const {data, error} = await this.supabase
      .from('budgets').select('*')
      .eq('user_id', this.userId).eq('is_active', true);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByCategoryId(categoryId: string): Promise<Budget[]> {
    const {data, error} = await this.supabase
      .from('budgets').select('*')
      .eq('user_id', this.userId).eq('category_id', categoryId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findActiveByCategoryId(categoryId: string): Promise<Budget | null> {
    const {data} = await this.supabase
      .from('budgets').select('*')
      .eq('user_id', this.userId).eq('is_active', true).eq('category_id', categoryId)
      .limit(1).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findOverallBudget(): Promise<Budget | null> {
    const {data} = await this.supabase
      .from('budgets').select('*')
      .eq('user_id', this.userId).eq('is_active', true).is('category_id', null)
      .limit(1).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async save(budget: Budget): Promise<void> {
    const {error} = await this.supabase.from('budgets').insert({
      id: budget.id, user_id: this.userId,
      category_id: budget.categoryId, amount: budget.amount,
      currency: budget.currency, period: budget.period,
      start_date: budget.startDate, end_date: budget.endDate,
      rollover: budget.rollover, is_active: budget.isActive,
      created_at: budget.createdAt, updated_at: budget.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(budget: Budget): Promise<void> {
    const {error} = await this.supabase.from('budgets').update({
      category_id: budget.categoryId, amount: budget.amount,
      currency: budget.currency, period: budget.period,
      start_date: budget.startDate, end_date: budget.endDate,
      rollover: budget.rollover, is_active: budget.isActive,
      updated_at: budget.updatedAt,
    }).eq('id', budget.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('budgets').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
