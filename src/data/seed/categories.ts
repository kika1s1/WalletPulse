import {getSupabaseClient} from '@data/datasources/supabase-client';
import {DEFAULT_CATEGORIES} from '@shared/constants/categories';

export async function seedDefaultCategories(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const {count} = await supabase
    .from('categories')
    .select('id', {count: 'exact', head: true})
    .eq('user_id', userId)
    .eq('is_default', true);

  if (count && count > 0) {
    return;
  }

  const now = Date.now();
  const rows = DEFAULT_CATEGORIES.map((cat, index) => ({
    user_id: userId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type,
    is_default: true,
    is_archived: false,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));

  const {error} = await supabase.from('categories').insert(rows);
  if (error) {
    throw new Error(`Failed to seed categories: ${error.message}`);
  }
}

export async function isCategorySeeded(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const {count} = await supabase
    .from('categories')
    .select('id', {count: 'exact', head: true})
    .eq('user_id', userId)
    .eq('is_default', true);
  return (count ?? 0) > 0;
}
