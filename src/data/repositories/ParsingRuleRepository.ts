import type {SupabaseClient} from '@supabase/supabase-js';
import type {IParsingRuleRepository} from '@domain/repositories/IParsingRuleRepository';
import type {ParsingRule, CreateParsingRuleInput} from '@domain/entities/ParsingRule';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): ParsingRule {
  return {
    id: row.id as string,
    sourceApp: row.source_app as string,
    packageName: row.package_name as string,
    ruleName: row.rule_name as string,
    pattern: row.pattern as string,
    transactionType: row.transaction_type as 'income' | 'expense',
    isActive: row.is_active as boolean,
    priority: Number(row.priority),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class ParsingRuleRepository implements IParsingRuleRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findAll(): Promise<ParsingRule[]> {
    const {data, error} = await this.supabase
      .from('parsing_rules').select('*').eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByPackageName(packageName: string): Promise<ParsingRule[]> {
    const {data, error} = await this.supabase
      .from('parsing_rules').select('*')
      .eq('user_id', this.userId).eq('package_name', packageName).eq('is_active', true);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain).sort((a, b) => b.priority - a.priority);
  }

  async create(input: CreateParsingRuleInput): Promise<void> {
    const now = Date.now();
    const {error} = await this.supabase.from('parsing_rules').insert({
      id: input.id, user_id: this.userId,
      source_app: input.sourceApp.trim(),
      package_name: input.packageName.trim(),
      rule_name: input.ruleName.trim(),
      pattern: input.pattern,
      transaction_type: input.transactionType,
      is_active: input.isActive, priority: input.priority,
      created_at: now, updated_at: now,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(id: string, input: Partial<CreateParsingRuleInput>): Promise<void> {
    const updates: Record<string, unknown> = {updated_at: Date.now()};
    if (input.sourceApp !== undefined) { updates.source_app = input.sourceApp.trim(); }
    if (input.packageName !== undefined) { updates.package_name = input.packageName.trim(); }
    if (input.ruleName !== undefined) { updates.rule_name = input.ruleName.trim(); }
    if (input.pattern !== undefined) { updates.pattern = input.pattern; }
    if (input.transactionType !== undefined) { updates.transaction_type = input.transactionType; }
    if (input.isActive !== undefined) { updates.is_active = input.isActive; }
    if (input.priority !== undefined) { updates.priority = input.priority; }

    const {error} = await this.supabase.from('parsing_rules').update(updates)
      .eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('parsing_rules').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
