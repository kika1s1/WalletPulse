import type {SupabaseClient} from '@supabase/supabase-js';
import type {Transaction, TransactionSource, TransactionType} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import type {Category, CategoryKind} from '@domain/entities/Category';
import type {Budget, BudgetPeriod} from '@domain/entities/Budget';

export type SearchEntity = 'transaction' | 'wallet' | 'category' | 'budget';

export type SearchFilters = {
  walletId?: string;
  categoryId?: string;
  type?: TransactionType;
  source?: TransactionSource;
  currency?: string;
  merchant?: string;
  startMs?: number;
  endMs?: number;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
};

export type SearchCursor = {
  afterDate: number;
  afterId: string;
};

export type SearchOptions = {
  query: string;
  filters?: SearchFilters;
  cursor?: SearchCursor;
  limit?: number;
};

export type SearchResult =
  | {entity: 'transaction'; id: string; rank: number; transaction: Transaction}
  | {entity: 'wallet'; id: string; rank: number; wallet: Wallet}
  | {entity: 'category'; id: string; rank: number; category: Category}
  | {entity: 'budget'; id: string; rank: number; budget: Budget};

export type GroupedSearchResults = {
  transactions: Extract<SearchResult, {entity: 'transaction'}>[];
  wallets: Extract<SearchResult, {entity: 'wallet'}>[];
  categories: Extract<SearchResult, {entity: 'category'}>[];
  budgets: Extract<SearchResult, {entity: 'budget'}>[];
};

type RpcRow = {
  entity: SearchEntity;
  id: string;
  rank: number | null;
  payload: Record<string, unknown>;
};

// Keep JSON-encoded tags parseable for safety during the legacy->array
// rollout. Once the migration is confirmed everywhere we can drop this.
function toTagArray(raw: unknown): string[] {
  if (Array.isArray(raw)) { return raw.map(String); }
  if (typeof raw !== 'string' || raw === '') { return []; }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch { return []; }
}

function transactionFromPayload(row: Record<string, unknown>): Transaction {
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
    tags: toTagArray(row.tags),
    receiptUri: (row.receipt_uri as string) ?? '',
    isRecurring: (row.is_recurring as boolean) ?? false,
    recurrenceRule: (row.recurrence_rule as string) ?? '',
    confidence: Number(row.confidence ?? 1),
    locationLat: row.location_lat === null || row.location_lat === undefined
      ? undefined : Number(row.location_lat),
    locationLng: row.location_lng === null || row.location_lng === undefined
      ? undefined : Number(row.location_lng),
    locationName: (row.location_name as string | null) ?? undefined,
    notes: (row.notes as string) ?? '',
    isTemplate: (row.is_template as boolean) ?? false,
    templateName: (row.template_name as string) ?? '',
    transactionDate: Number(row.transaction_date),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function walletFromPayload(row: Record<string, unknown>): Wallet {
  return {
    id: row.id as string,
    currency: row.currency as string,
    name: row.name as string,
    balance: Number(row.balance),
    isActive: (row.is_active as boolean) ?? true,
    icon: (row.icon as string) ?? '',
    color: (row.color as string) ?? '',
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
  };
}

function categoryFromPayload(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: (row.icon as string) ?? '',
    color: (row.color as string) ?? '',
    type: (row.type as CategoryKind) ?? 'both',
    parentId: (row.parent_id as string | null) ?? undefined,
    isDefault: (row.is_default as boolean) ?? false,
    isArchived: (row.is_archived as boolean) ?? false,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
  };
}

function budgetFromPayload(row: Record<string, unknown>): Budget {
  return {
    id: row.id as string,
    categoryId: (row.category_id as string | null) ?? null,
    amount: Number(row.amount),
    currency: row.currency as string,
    period: (row.period as BudgetPeriod) ?? 'monthly',
    startDate: Number(row.start_date ?? 0),
    endDate: Number(row.end_date ?? 0),
    rollover: (row.rollover as boolean) ?? false,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0),
  };
}

function filtersToJson(filters?: SearchFilters): Record<string, unknown> {
  if (!filters) { return {}; }
  const out: Record<string, unknown> = {};
  // The RPC reads jsonb keys via `->>` and casts them — so scalars are
  // sent as strings. Arrays stay structured.
  if (filters.walletId) { out.walletId = filters.walletId; }
  if (filters.categoryId) { out.categoryId = filters.categoryId; }
  if (filters.type) { out.type = filters.type; }
  if (filters.source) { out.source = filters.source; }
  if (filters.currency) { out.currency = filters.currency; }
  if (filters.merchant) { out.merchant = filters.merchant; }
  if (filters.startMs !== undefined) { out.startMs = String(filters.startMs); }
  if (filters.endMs !== undefined) { out.endMs = String(filters.endMs); }
  if (filters.minAmount !== undefined) { out.minAmount = String(filters.minAmount); }
  if (filters.maxAmount !== undefined) { out.maxAmount = String(filters.maxAmount); }
  if (filters.tags && filters.tags.length > 0) { out.tags = filters.tags; }
  return out;
}

export class UniversalSearchRepository {
  // The mobile app uses its own session table for auth, so the supabase
  // client never has a JWT — auth.uid() inside the RPC is always NULL.
  // We pass the user id explicitly the same way every other repo in the
  // codebase does (see TransactionRepository, WalletRepository, ...).
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async search(options: SearchOptions): Promise<GroupedSearchResults> {
    const rpcArgs: Record<string, unknown> = {
      p_query: options.query ?? '',
      p_filters: filtersToJson(options.filters),
      p_limit: options.limit ?? 50,
      p_user_id: this.userId,
    };
    if (options.cursor) {
      rpcArgs.p_after_date = options.cursor.afterDate;
      rpcArgs.p_after_id = options.cursor.afterId;
    }

    const {data, error} = await this.supabase.rpc('search_everything', rpcArgs);
    if (error) { throw new Error(error.message); }

    const rows = (data ?? []) as RpcRow[];
    const grouped: GroupedSearchResults = {
      transactions: [], wallets: [], categories: [], budgets: [],
    };

    for (const row of rows) {
      const rank = Number(row.rank ?? 0);
      switch (row.entity) {
        case 'transaction':
          grouped.transactions.push({
            entity: 'transaction',
            id: row.id,
            rank,
            transaction: transactionFromPayload(row.payload),
          });
          break;
        case 'wallet':
          grouped.wallets.push({
            entity: 'wallet', id: row.id, rank,
            wallet: walletFromPayload(row.payload),
          });
          break;
        case 'category':
          grouped.categories.push({
            entity: 'category', id: row.id, rank,
            category: categoryFromPayload(row.payload),
          });
          break;
        case 'budget':
          grouped.budgets.push({
            entity: 'budget', id: row.id, rank,
            budget: budgetFromPayload(row.payload),
          });
          break;
        default: {
          // Ignore future-unknown entity types instead of throwing — lets
          // the server add new entity types without crashing old clients.
          break;
        }
      }
    }

    return grouped;
  }
}
