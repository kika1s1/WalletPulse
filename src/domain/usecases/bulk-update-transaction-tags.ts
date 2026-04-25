import type {Transaction} from '@domain/entities/Transaction';
import {createTransaction} from '@domain/entities/Transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import {normalizeTag, validateTag} from '@domain/usecases/tag-management';
import type {BulkUpdateResult} from '@domain/usecases/bulk-update-transaction-category';

export type BulkTagUpdateMode = 'add' | 'remove' | 'replace';

export type BulkUpdateTransactionTagsInput = {
  ids: string[];
  mode: BulkTagUpdateMode;
  tags: string[];
  now?: number;
};

type Deps = {
  transactionRepo: ITransactionRepository;
};

function normalizeValidTags(tags: string[]): string[] {
  const normalized = tags.map(normalizeTag).filter(Boolean);
  const valid = normalized.filter((tag) => validateTag(tag) === null);
  return [...new Set(valid)];
}

function applyTags(existing: string[], incoming: string[], mode: BulkTagUpdateMode): string[] {
  const existingNormalized = normalizeValidTags(existing);
  if (mode === 'replace') {
    return incoming;
  }
  if (mode === 'remove') {
    const toRemove = new Set(incoming);
    return existingNormalized.filter((tag) => !toRemove.has(tag));
  }
  return [...new Set([...existingNormalized, ...incoming])];
}

function rebuildWithTags(
  transaction: Transaction,
  tags: string[],
  updatedAt: number,
): Transaction {
  return createTransaction({
    ...transaction,
    tags,
    updatedAt,
  });
}

export function makeBulkUpdateTransactionTags({transactionRepo}: Deps) {
  return async (input: BulkUpdateTransactionTagsInput): Promise<BulkUpdateResult> => {
    const tags = normalizeValidTags(input.tags);
    if (tags.length === 0) {
      throw new Error('At least one valid tag is required');
    }

    const uniqueIds = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))];
    const result: BulkUpdateResult = {updatedIds: [], failed: []};
    const updatedAt = input.now ?? Date.now();

    for (const id of uniqueIds) {
      try {
        const existing = await transactionRepo.findById(id);
        if (!existing) {
          result.failed.push({id, reason: 'Transaction not found'});
          continue;
        }
        const nextTags = applyTags(existing.tags, tags, input.mode);
        const updated = rebuildWithTags(existing, nextTags, updatedAt);
        await transactionRepo.update(updated);
        result.updatedIds.push(id);
      } catch (error) {
        result.failed.push({
          id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  };
}
