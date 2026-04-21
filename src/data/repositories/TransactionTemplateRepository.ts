import type {SupabaseClient} from '@supabase/supabase-js';
import type {ITransactionTemplateRepository} from '@domain/repositories/ITransactionTemplateRepository';
import type {TransactionTemplate, TemplateInput} from '@domain/entities/TransactionTemplate';
import type {TransactionType} from '@domain/entities/Transaction';

type Row = Record<string, unknown>;

function parseTagsJson(tagsJson: string): string[] {
  if (!tagsJson) { return []; }
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}

function rowToDomain(row: Row): TransactionTemplate {
  const tags = parseTagsJson((row.tags as string) ?? '[]');
  return {
    id: row.id as string,
    name: row.name as string,
    icon: (row.icon as string) || 'receipt',
    color: (row.color as string) || '#6C5CE7',
    type: row.type as TransactionType,
    categoryId: (row.category_id as string) || undefined,
    amount: row.amount ? Number(row.amount) : undefined,
    currency: (row.currency as string) || undefined,
    description: (row.description as string) || undefined,
    merchant: (row.merchant as string) || undefined,
    tags: tags.length > 0 ? tags : undefined,
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
  };
}

export class TransactionTemplateRepository implements ITransactionTemplateRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findAll(): Promise<TransactionTemplate[]> {
    const {data, error} = await this.supabase
      .from('transaction_templates').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async create(input: TransactionTemplate): Promise<void> {
    const now = Date.now();
    const {error} = await this.supabase.from('transaction_templates').insert({
      id: input.id, user_id: this.userId,
      name: input.name, amount: input.amount ?? 0,
      currency: input.currency ?? '', type: input.type,
      category_id: input.categoryId ?? '',
      description: input.description ?? '',
      merchant: input.merchant ?? '', usage_count: 0,
      icon: input.icon, color: input.color,
      tags: JSON.stringify(input.tags ?? []),
      sort_order: input.sortOrder,
      created_at: input.createdAt ?? now, updated_at: now,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(id: string, input: Partial<TemplateInput>): Promise<void> {
    const updates: Record<string, unknown> = {updated_at: Date.now()};
    if (input.name !== undefined) { updates.name = input.name; }
    if (input.icon !== undefined) { updates.icon = input.icon; }
    if (input.color !== undefined) { updates.color = input.color; }
    if (input.type !== undefined) { updates.type = input.type; }
    if (input.amount !== undefined) { updates.amount = input.amount; }
    if (input.currency !== undefined) { updates.currency = input.currency; }
    if (input.description !== undefined) { updates.description = input.description; }
    if (input.merchant !== undefined) { updates.merchant = input.merchant; }
    if (input.tags !== undefined) { updates.tags = JSON.stringify(input.tags); }
    if (input.categoryId !== undefined) { updates.category_id = input.categoryId; }

    const {error} = await this.supabase.from('transaction_templates').update(updates)
      .eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('transaction_templates').delete()
      .eq('id', id).eq('user_id', this.userId);
  }

  async incrementUsageCount(id: string): Promise<void> {
    const {data} = await this.supabase
      .from('transaction_templates').select('usage_count')
      .eq('id', id).eq('user_id', this.userId).maybeSingle();
    const current = data ? Number(data.usage_count) : 0;
    await this.supabase.from('transaction_templates').update({
      usage_count: current + 1, updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
  }
}
