import type {SupabaseClient} from '@supabase/supabase-js';
import type {Tag} from '@domain/entities/Tag';
import type {ITagRepository} from '@domain/repositories/ITagRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: (row.color as string) ?? '',
    usageCount: Number(row.usage_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class TagRepository implements ITagRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findAll(): Promise<Tag[]> {
    const {data, error} = await this.supabase
      .from('tags').select('*')
      .eq('user_id', this.userId).order('name', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByName(name: string): Promise<Tag | null> {
    const {data} = await this.supabase
      .from('tags').select('*')
      .eq('user_id', this.userId).eq('name', name)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async save(tag: Tag): Promise<void> {
    const {error} = await this.supabase.from('tags').insert({
      id: tag.id, user_id: this.userId,
      name: tag.name, color: tag.color === '' ? null : tag.color,
      usage_count: tag.usageCount,
      created_at: tag.createdAt, updated_at: tag.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('tags').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
