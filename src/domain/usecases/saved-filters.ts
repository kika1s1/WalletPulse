import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {generateId} from '@shared/utils/hash';
import {getLocalDataSource, isDataSourceReady} from '@data/datasources/LocalDataSource';

export type SavedFilter = {
  id: string;
  name: string;
  filter: TransactionFilter;
  createdAt: number;
};

export function createSavedFilter(
  name: string,
  filter: TransactionFilter,
): SavedFilter {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Filter name is required');
  }
  return {
    id: generateId(),
    name: trimmed,
    filter,
    createdAt: Date.now(),
  };
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
    const ds = getLocalDataSource();
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
    const ds = getLocalDataSource();
    await ds.settings.set('recent_searches', JSON.stringify(recentSearches));
  } catch {
    // Non-critical
  }
}

async function persistFilters(): Promise<void> {
  try {
    const ds = getLocalDataSource();
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
): SavedFilter {
  const saved = createSavedFilter(name, filter);
  savedFilters.unshift(saved);
  void persistFilters();
  return saved;
}

export function removeSavedFilter(id: string): void {
  savedFilters = savedFilters.filter((f) => f.id !== id);
  void persistFilters();
}
