import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';

const MAX_RECENT = 20;
let recentSearches: string[] = [];
let initialized = false;

async function ensureLoaded(): Promise<void> {
  if (initialized) {
    return;
  }
  if (!isDataSourceReady()) { return; }
  try {
    const ds = getSupabaseDataSource();
    const raw = await ds.settings.get('recent_searches');
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        recentSearches = parsed.map(String).slice(0, MAX_RECENT);
      }
    }
  } catch {
    // Settings not available yet — start empty.
  } finally {
    initialized = true;
  }
}

async function persistRecent(): Promise<void> {
  if (!isDataSourceReady()) { return; }
  try {
    const ds = getSupabaseDataSource();
    await ds.settings.set('recent_searches', JSON.stringify(recentSearches));
  } catch {
    // Best-effort persistence — losing the list is non-critical.
  }
}

export async function loadSavedData(): Promise<void> {
  await ensureLoaded();
}

export function getRecentSearches(): string[] {
  return [...recentSearches];
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) { return; }
  recentSearches = [
    trimmed,
    ...recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT);
  void persistRecent();
}

export function clearRecentSearches(): void {
  recentSearches = [];
  void persistRecent();
}

// Test-only reset hook so suite isolation works without exposing internals.
export function resetRecentSearchesForTests(): void {
  recentSearches = [];
  initialized = false;
}
