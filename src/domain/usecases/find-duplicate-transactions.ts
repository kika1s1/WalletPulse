import type {Transaction} from '@domain/entities/Transaction';

const DEFAULT_DATE_WINDOW_MS = 3 * 86_400_000;

export type DuplicateTransactionGroup = {
  id: string;
  reason: string;
  transactions: Transaction[];
};

export type FindDuplicateTransactionsOptions = {
  dateWindowMs?: number;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function merchantKey(transaction: Transaction): string {
  return normalizeText(transaction.merchant || transaction.description);
}

function groupId(transactions: Transaction[]): string {
  return transactions.map((transaction) => transaction.id).sort().join(':');
}

function byDateAsc(a: Transaction, b: Transaction): number {
  return a.transactionDate - b.transactionDate || a.id.localeCompare(b.id);
}

function groupBySourceHash(transactions: Transaction[]): DuplicateTransactionGroup[] {
  const byHash = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    if (!transaction.sourceHash.trim()) {
      continue;
    }
    const bucket = byHash.get(transaction.sourceHash) ?? [];
    bucket.push(transaction);
    byHash.set(transaction.sourceHash, bucket);
  }

  return [...byHash.values()]
    .filter((bucket) => bucket.length > 1)
    .map((bucket) => {
      const sorted = [...bucket].sort(byDateAsc);
      return {
        id: groupId(sorted),
        reason: 'Matching source hash',
        transactions: sorted,
      };
    });
}

function groupByTransactionShape(
  transactions: Transaction[],
  dateWindowMs: number,
  existingGroupIds: Set<string>,
): DuplicateTransactionGroup[] {
  const buckets = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const key = [
      transaction.currency.toUpperCase(),
      transaction.amount,
      merchantKey(transaction),
    ].join(':');
    if (key.endsWith(':')) {
      continue;
    }
    const bucket = buckets.get(key) ?? [];
    bucket.push(transaction);
    buckets.set(key, bucket);
  }

  const groups: DuplicateTransactionGroup[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort(byDateAsc);
    let current: Transaction[] = [];
    for (const transaction of sorted) {
      const first = current[0];
      if (!first || transaction.transactionDate - first.transactionDate <= dateWindowMs) {
        current.push(transaction);
        continue;
      }
      if (current.length > 1) {
        const id = groupId(current);
        if (!existingGroupIds.has(id)) {
          groups.push({
            id,
            reason: 'Possible duplicate: same amount, currency, and merchant',
            transactions: current,
          });
        }
      }
      current = [transaction];
    }
    if (current.length > 1) {
      const id = groupId(current);
      if (!existingGroupIds.has(id)) {
        groups.push({
          id,
          reason: 'Possible duplicate: same amount, currency, and merchant',
          transactions: current,
        });
      }
    }
  }
  return groups;
}

export function findDuplicateTransactions(
  transactions: Transaction[],
  options: FindDuplicateTransactionsOptions = {},
): DuplicateTransactionGroup[] {
  const dateWindowMs = options.dateWindowMs ?? DEFAULT_DATE_WINDOW_MS;
  const sourceHashGroups = groupBySourceHash(transactions);
  const existingIds = new Set(sourceHashGroups.map((group) => group.id));
  const shapeGroups = groupByTransactionShape(transactions, dateWindowMs, existingIds);
  return [...sourceHashGroups, ...shapeGroups].sort((a, b) => {
    const aDate = a.transactions[0]?.transactionDate ?? 0;
    const bDate = b.transactions[0]?.transactionDate ?? 0;
    return bDate - aDate;
  });
}
