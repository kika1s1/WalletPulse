import type {Transaction} from '@domain/entities/Transaction';
import {createTransaction} from '@domain/entities/Transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';

export type BulkUpdateFailure = {
  id: string;
  reason: string;
};

export type BulkUpdateResult = {
  updatedIds: string[];
  failed: BulkUpdateFailure[];
};

export type BulkUpdateTransactionCategoryInput = {
  ids: string[];
  categoryId: string;
  now?: number;
};

type Deps = {
  transactionRepo: ITransactionRepository;
};

function rebuildWithCategory(
  transaction: Transaction,
  categoryId: string,
  updatedAt: number,
): Transaction {
  return createTransaction({
    ...transaction,
    categoryId,
    updatedAt,
  });
}

export function makeBulkUpdateTransactionCategory({transactionRepo}: Deps) {
  return async (input: BulkUpdateTransactionCategoryInput): Promise<BulkUpdateResult> => {
    const categoryId = input.categoryId.trim();
    if (!categoryId) {
      throw new Error('Category id is required');
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
        const updated = rebuildWithCategory(existing, categoryId, updatedAt);
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
