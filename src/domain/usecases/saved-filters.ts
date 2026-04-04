import type {TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {generateId} from '@shared/utils/hash';

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
}

export function getRecentSearches(): string[] {
  return [...recentSearches];
}

export function clearRecentSearches(): void {
  recentSearches = [];
}
