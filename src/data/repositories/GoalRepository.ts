import type {SupabaseClient} from '@supabase/supabase-js';
import type {Goal, GoalCategory} from '@domain/entities/Goal';
import type {IGoalRepository} from '@domain/repositories/IGoalRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Goal {
  return {
    id: row.id as string,
    name: row.name as string,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    currency: row.currency as string,
    deadline: Number(row.deadline),
    icon: row.icon as string,
    color: row.color as string,
    category: row.category as GoalCategory,
    isCompleted: row.is_completed as boolean,
    completedAt: row.completed_at != null ? Number(row.completed_at) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class GoalRepository implements IGoalRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<Goal | null> {
    const {data} = await this.supabase
      .from('goals').select('*')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<Goal[]> {
    const {data, error} = await this.supabase
      .from('goals').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findActive(): Promise<Goal[]> {
    const {data, error} = await this.supabase
      .from('goals').select('*')
      .eq('user_id', this.userId).eq('is_completed', false);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findCompleted(): Promise<Goal[]> {
    const {data, error} = await this.supabase
      .from('goals').select('*')
      .eq('user_id', this.userId).eq('is_completed', true);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(goal: Goal): Promise<void> {
    const {error} = await this.supabase.from('goals').insert({
      id: goal.id, user_id: this.userId,
      name: goal.name, target_amount: goal.targetAmount,
      current_amount: goal.currentAmount, currency: goal.currency,
      deadline: goal.deadline, icon: goal.icon, color: goal.color,
      category: goal.category, is_completed: goal.isCompleted,
      completed_at: goal.completedAt ?? null,
      created_at: goal.createdAt, updated_at: goal.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(goal: Goal): Promise<void> {
    const {error} = await this.supabase.from('goals').update({
      name: goal.name, target_amount: goal.targetAmount,
      current_amount: goal.currentAmount, currency: goal.currency,
      deadline: goal.deadline, icon: goal.icon, color: goal.color,
      category: goal.category, is_completed: goal.isCompleted,
      completed_at: goal.completedAt ?? null,
      updated_at: goal.updatedAt,
    }).eq('id', goal.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async updateProgress(id: string, currentAmount: number): Promise<void> {
    const {error} = await this.supabase.from('goals').update({
      current_amount: currentAmount, updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async markCompleted(id: string, completedAt: number): Promise<void> {
    const {error} = await this.supabase.from('goals').update({
      is_completed: true, completed_at: completedAt, updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('goals').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
