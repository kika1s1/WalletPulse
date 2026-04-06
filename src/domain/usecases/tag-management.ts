import type {Transaction} from '@domain/entities/Transaction';

export const MAX_TAG_LENGTH = 30;
const MAX_SUGGESTIONS = 10;
const TAG_PATTERN = /^[a-zA-Z0-9\- ]+$/;

export function collectAllTags(transactions: Transaction[]): string[] {
  const freq = new Map<string, number>();
  for (const txn of transactions) {
    for (const tag of txn.tags) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

export function suggestTags(
  query: string,
  allTags: string[],
  exclude: string[] = [],
): string[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  const excludeSet = new Set(exclude.map((e) => e.toLowerCase()));
  return allTags
    .filter(
      (tag) =>
        tag.toLowerCase().startsWith(trimmed) &&
        !excludeSet.has(tag.toLowerCase()),
    )
    .slice(0, MAX_SUGGESTIONS);
}

export function validateTag(tag: string): string | null {
  const trimmed = tag.trim();
  if (!trimmed) {
    return 'Tag cannot be empty';
  }
  if (trimmed.length > MAX_TAG_LENGTH) {
    return `Tag must be ${MAX_TAG_LENGTH} characters or fewer`;
  }
  if (!TAG_PATTERN.test(trimmed)) {
    return 'Tag can only contain letters, numbers, hyphens, and spaces';
  }
  return null;
}

export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Merges tag names from the tags table and from transactions, dedupes, sorts A to Z. */
export function mergeUniqueSortedTagNames(
  tableTagNames: string[],
  transactionTagNames: string[],
): string[] {
  const set = new Set<string>();
  for (const t of tableTagNames) {
    const n = normalizeTag(t);
    if (n) {
      set.add(n);
    }
  }
  for (const t of transactionTagNames) {
    const n = normalizeTag(t);
    if (n) {
      set.add(n);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
