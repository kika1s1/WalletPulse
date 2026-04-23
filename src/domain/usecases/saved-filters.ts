import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {generateId} from '@shared/utils/hash';
import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';

export type SavedFilter = {
  id: string;
  name: string;
  filter: TransactionFilter;
  // Optional raw query string. Added in the universal-search overhaul so
  // saved presets can also capture free-text + operator tokens (e.g.
  // `category:food amount:>50`). Older presets may not have this field,
  // so callers must treat it as optional.
  rawQuery?: string;
  createdAt: number;
};

export function createSavedFilter(
  name: string,
  filter: TransactionFilter,
  rawQuery?: string,
): SavedFilter {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Filter name is required');
  }
  const saved: SavedFilter = {
    id: generateId(),
    name: trimmed,
    filter,
    createdAt: Date.now(),
  };
  if (rawQuery && rawQuery.trim()) {
    saved.rawQuery = rawQuery.trim();
  }
  return saved;
}

// Builds a sensible default name from the active filter + query so users
// don't have to type one. e.g. `category:food amount:>50` -> "Food · >50".
export function suggestSavedFilterName(
  filter: TransactionFilter,
  rawQuery?: string,
): string {
  const parts: string[] = [];
  if (rawQuery && rawQuery.trim()) { parts.push(rawQuery.trim()); }
  if (filter.type) { parts.push(filter.type); }
  if (filter.currency) { parts.push(filter.currency); }
  if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
    const min = filter.minAmount !== undefined
      ? `>=${(filter.minAmount / 100).toFixed(0)}`
      : '';
    const max = filter.maxAmount !== undefined
      ? `<=${(filter.maxAmount / 100).toFixed(0)}`
      : '';
    parts.push([min, max].filter(Boolean).join(' '));
  }
  if (filter.tags && filter.tags.length > 0) {
    parts.push(`#${filter.tags.join(' #')}`);
  }
  return parts.filter(Boolean).join(' · ') || `Filter ${new Date().toLocaleDateString()}`;
}

const MAX_RECENT = 20;
let recentSearches: string[] = [];
let savedFilters: SavedFilter[] = [];
let initialized = false;

async function ensureLoaded(): Promise<void> {
  if (initialized) {
    return;
  }
  if (!isDataSourceReady()) { return; }
  try {
    const ds = getSupabaseDataSource();
    const recentRaw = await ds.settings.get('recent_searches');
    if (recentRaw) {
      const parsed = JSON.parse(recentRaw) as unknown;
      if (Array.isArray(parsed)) {
        recentSearches = parsed.map(String).slice(0, MAX_RECENT);
      }
    }
    const filtersRaw = await ds.settings.get('saved_filters');
    if (filtersRaw) {
      const parsed = JSON.parse(filtersRaw) as unknown;
      if (Array.isArray(parsed)) {
        savedFilters = parsed as SavedFilter[];
      }
    }
  } catch {
    // Settings not available yet
  }
  initialized = true;
}

async function persistRecent(): Promise<void> {
  try {
    const ds = getSupabaseDataSource();
    await ds.settings.set('recent_searches', JSON.stringify(recentSearches));
  } catch {
    // Non-critical
  }
}

async function persistFilters(): Promise<void> {
  try {
    const ds = getSupabaseDataSource();
    await ds.settings.set('saved_filters', JSON.stringify(savedFilters));
  } catch {
    // Non-critical
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }
  recentSearches = recentSearches.filter((s) => s !== trimmed);
  recentSearches.unshift(trimmed);
  if (recentSearches.length > MAX_RECENT) {
    recentSearches = recentSearches.slice(0, MAX_RECENT);
  }
  void persistRecent();
}

export function getRecentSearches(): string[] {
  return [...recentSearches];
}

export function clearRecentSearches(): void {
  recentSearches = [];
  void persistRecent();
}

export async function loadSavedData(): Promise<void> {
  await ensureLoaded();
}

export function getSavedFilters(): SavedFilter[] {
  return [...savedFilters];
}

export function addSavedFilter(
  name: string,
  filter: TransactionFilter,
  rawQuery?: string,
): SavedFilter {
  const saved = createSavedFilter(name, filter, rawQuery);
  savedFilters.unshift(saved);
  void persistFilters();
  return saved;
}

export function removeSavedFilter(id: string): void {
  savedFilters = savedFilters.filter((f) => f.id !== id);
  void persistFilters();
}
