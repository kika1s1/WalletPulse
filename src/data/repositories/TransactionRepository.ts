import type {SupabaseClient} from '@supabase/supabase-js';
import type {Transaction, TransactionSource, TransactionType} from '@domain/entities/Transaction';
import type {
  ITransactionRepository,
  TransactionFilter,
  TransactionSort,
  TransactionSortField,
} from '@domain/repositories/ITransactionRepository';

type Row = Record<string, unknown>;

function parseTagsJson(tagsJson: string): string[] {
  if (!tagsJson) { return []; }
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}

function rowToDomain(row: Row): Transaction {
  return {
    id: row.id as string,
    walletId: row.wallet_id as string,
    categoryId: row.category_id as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    type: row.type as TransactionType,
    description: (row.description as string) ?? '',
    merchant: (row.merchant as string) ?? '',
    source: (row.source as TransactionSource) ?? 'manual',
    sourceHash: (row.source_hash as string) ?? '',
    tags: parseTagsJson((row.tags as string) ?? '[]'),
    receiptUri: (row.receipt_uri as string) ?? '',
    isRecurring: (row.is_recurring as boolean) ?? false,
    recurrenceRule: (row.recurrence_rule as string) ?? '',
    confidence: Number(row.confidence ?? 1),
    locationLat: row.location_lat != null ? Number(row.location_lat) : undefined,
    locationLng: row.location_lng != null ? Number(row.location_lng) : undefined,
    locationName: (row.location_name as string | null) ?? undefined,
    notes: (row.notes as string) ?? '',
    isTemplate: (row.is_template as boolean) ?? false,
    templateName: (row.template_name as string) ?? '',
    transactionDate: Number(row.transaction_date),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function sortColumnForField(field: TransactionSortField): string {
  switch (field) {
    case 'transactionDate': return 'transaction_date';
    case 'amount': return 'amount';
    case 'createdAt': return 'created_at';
    default: { const _exhaustive: never = field; return _exhaustive; }
  }
}

export class TransactionRepository implements ITransactionRepository {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  private toInsertRow(t: Transaction) {
    return {
      id: t.id,
      user_id: this.userId,
      wallet_id: t.walletId,
      category_id: t.categoryId,
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      description: t.description,
      merchant: t.merchant,
      source: t.source,
      source_hash: t.sourceHash,
      tags: JSON.stringify(t.tags),
      receipt_uri: t.receiptUri,
      is_recurring: t.isRecurring,
      recurrence_rule: t.recurrenceRule,
      confidence: t.confidence,
      location_lat: t.locationLat ?? null,
      location_lng: t.locationLng ?? null,
      location_name: t.locationName ?? null,
      notes: t.notes,
      is_template: t.isTemplate,
      template_name: t.templateName,
      transaction_date: t.transactionDate,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    };
  }

  private applyFilters(
    query: any,
    filter?: TransactionFilter,
  ) {
    let q = query;
    if (!filter) { return q; }
    if (filter.walletId) { q = q.eq('wallet_id', filter.walletId); }
    if (filter.categoryId) { q = q.eq('category_id', filter.categoryId); }
    if (filter.type) { q = q.eq('type', filter.type); }
    if (filter.source) { q = q.eq('source', filter.source); }
    if (filter.currency) { q = q.eq('currency', filter.currency); }
    if (filter.merchant) { q = q.eq('merchant', filter.merchant); }
    if (filter.dateRange) {
      q = q.gte('transaction_date', filter.dateRange.startMs)
           .lte('transaction_date', filter.dateRange.endMs);
    }
    if (filter.minAmount !== undefined) { q = q.gte('amount', filter.minAmount); }
    if (filter.maxAmount !== undefined) { q = q.lte('amount', filter.maxAmount); }
    if (filter.searchQuery?.trim()) {
      const term = `%${filter.searchQuery.trim()}%`;
      q = q.or(`description.ilike.${term},merchant.ilike.${term},notes.ilike.${term}`);
    }
    return q;
  }

  async findById(id: string): Promise<Transaction | null> {
    const {data} = await this.supabase
      .from('transactions').select('*')
      .eq('id', id).eq('user_id', this.userId)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findAll(filter?: TransactionFilter, sort?: TransactionSort): Promise<Transaction[]> {
    let query = this.supabase.from('transactions').select('*').eq('user_id', this.userId);
    query = this.applyFilters(query, filter);
    const col = sort ? sortColumnForField(sort.field) : 'transaction_date';
    const asc = sort ? sort.direction === 'asc' : false;
    query = query.order(col, {ascending: asc});
    const {data, error} = await query;
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByWalletId(walletId: string): Promise<Transaction[]> {
    const {data, error} = await this.supabase
      .from('transactions').select('*')
      .eq('user_id', this.userId).eq('wallet_id', walletId)
      .order('transaction_date', {ascending: false});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findByCategoryId(categoryId: string): Promise<Transaction[]> {
    const {data, error} = await this.supabase
      .from('transactions').select('*')
      .eq('user_id', this.userId).eq('category_id', categoryId)
      .order('transaction_date', {ascending: false});
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async findBySourceHash(hash: string): Promise<Transaction | null> {
    const {data} = await this.supabase
      .from('transactions').select('*')
      .eq('user_id', this.userId).eq('source_hash', hash)
      .maybeSingle();
    return data ? rowToDomain(data) : null;
  }

  async findRecent(limit: number): Promise<Transaction[]> {
    const {data, error} = await this.supabase
      .from('transactions').select('*')
      .eq('user_id', this.userId)
      .order('transaction_date', {ascending: false})
      .limit(limit);
    if (error) { throw new Error(error.message); }
    return (data ?? []).map(rowToDomain);
  }

  async save(transaction: Transaction): Promise<void> {
    const {error} = await this.supabase.from('transactions').insert(this.toInsertRow(transaction));
    if (error) { throw new Error(error.message); }
  }

  async update(transaction: Transaction): Promise<void> {
    const row = this.toInsertRow(transaction);
    const {id: _id, user_id: _uid, ...updates} = row;
    const {error} = await this.supabase.from('transactions').update(updates)
      .eq('id', transaction.id).eq('user_id', this.userId);
    if (error) { throw new Error(error.message); }
  }

  async delete(id: string): Promise<void> {
    await this.supabase.from('transactions').delete()
      .eq('id', id).eq('user_id', this.userId);
  }

  async countByFilter(filter: TransactionFilter): Promise<number> {
    let query = this.supabase.from('transactions').select('id', {count: 'exact', head: true}).eq('user_id', this.userId);
    query = this.applyFilters(query, filter);
    const {count, error} = await query;
    if (error) { throw new Error(error.message); }
    return count ?? 0;
  }

  async sumByFilter(filter: TransactionFilter): Promise<number> {
    let query = this.supabase.from('transactions').select('amount').eq('user_id', this.userId);
    query = this.applyFilters(query, filter);
    const {data, error} = await query;
    if (error) { throw new Error(error.message); }
    return (data ?? []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  }
}
