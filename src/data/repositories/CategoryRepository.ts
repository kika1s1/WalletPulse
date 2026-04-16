import type {SupabaseClient} from '@supabase/supabase-js';
import type {Category, CategoryKind} from '@domain/entities/Category';
import type {ICategoryRepository} from '@domain/repositories/ICategoryRepository';

type Row = Record<string, unknown>;

function rowToDomain(row: Row): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    type: row.type as CategoryKind,
    parentId: (row.parent_id as string | null) ?? undefined,
    isDefault: row.is_default as boolean,
    isArchived: row.is_archived as boolean,
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class CategoryRepository implements ICategoryRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async findById(id: string): Promise<Category | null> {
    const {data} = await this.supabase
      .from('categories').select('*')
      .eq('id', id).eq('user_id', this.userId)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(): Promise<Category[]> {
    const {data, error} = await this.supabase
      .from('categories').select('*')
      .eq('user_id', this.userId)
      .order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByType(type: 'expense' | 'income' | 'both'): Promise<Category[]> {
    let query = this.supabase.from('categories').select('*').eq('user_id', this.userId);
    if (type === 'both') {
      query = query.eq('type', 'both');
    } else {
      query = query.in('type', [type, 'both']);
    }
    const {data, error} = await query.order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findDefaults(): Promise<Category[]> {
    const {data, error} = await this.supabase
      .from('categories').select('*')
      .eq('user_id', this.userId).eq('is_default', true)
      .order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findSubcategories(parentId: string): Promise<Category[]> {
    const {data, error} = await this.supabase
      .from('categories').select('*')
      .eq('user_id', this.userId).eq('parent_id', parentId)
      .order('sort_order', {ascending: true});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByName(name: string): Promise<Category | null> {
    const {data} = await this.supabase
      .from('categories').select('*')
      .eq('user_id', this.userId).eq('name', name)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async save(category: Category): Promise<void> {
    const {error} = await this.supabase.from('categories').insert({
      id: category.id,
      user_id: this.userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      parent_id: category.parentId ?? null,
      is_default: category.isDefault,
      is_archived: category.isArchived,
      sort_order: category.sortOrder,
      created_at: category.createdAt,
      updated_at: category.updatedAt,
    });
    if (error) { throw new Error(error.message); }
  }

  async update(category: Category): Promise<void> {
    const {error} = await this.supabase.from('categories').update({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      parent_id: category.parentId ?? null,
      is_default: category.isDefault,
      is_archived: category.isArchived,
      sort_order: category.sortOrder,
      updated_at: category.updatedAt,
    }).eq('id', category.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async archive(id: string): Promise<void> {
    const {error} = await this.supabase.from('categories').update({
      is_archived: true,
      updated_at: Date.now(),
    }).eq('id', id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('categories').delete()
      .eq('id', id).eq('user_id', this.userId);
  }
}
