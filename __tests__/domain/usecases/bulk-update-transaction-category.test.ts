import {makeBulkUpdateTransactionCategory} from '@domain/usecases/bulk-update-transaction-category';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';

function transaction(id: string, categoryId = 'old-cat'): Transaction {
  return {
    id,
    walletId: 'wallet-1',
    categoryId,
    amount: 1200,
    currency: 'USD',
    type: 'expense',
    description: '',
    merchant: '',
    source: 'manual',
    sourceHash: '',
    tags: [],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: 1_704_000_000_000,
    createdAt: 1_704_000_000_000,
    updatedAt: 1_704_000_000_000,
  };
}

function createRepo(transactions: Record<string, Transaction>): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(async (id: string) => transactions[id] ?? null),
    findAll: jest.fn(),
    findByWalletId: jest.fn(),
    findByCategoryId: jest.fn(),
    findBySourceHash: jest.fn(),
    findRecent: jest.fn(),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
    countByFilter: jest.fn(),
    sumByFilter: jest.fn(),
  };
}

describe('makeBulkUpdateTransactionCategory', () => {
  it('updates every selected transaction to the target category without changing amounts', async () => {
    const repo = createRepo({
      'txn-1': transaction('txn-1'),
      'txn-2': transaction('txn-2'),
    });
    const execute = makeBulkUpdateTransactionCategory({transactionRepo: repo});

    const result = await execute({
      ids: ['txn-1', 'txn-2'],
      categoryId: 'new-cat',
    });

    expect(result.updatedIds).toEqual(['txn-1', 'txn-2']);
    expect(result.failed).toEqual([]);
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'txn-1',
      categoryId: 'new-cat',
      amount: 1200,
    }));
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'txn-2',
      categoryId: 'new-cat',
      amount: 1200,
    }));
  });

  it('reports missing transactions as failures and continues with the rest', async () => {
    const repo = createRepo({'txn-1': transaction('txn-1')});
    const execute = makeBulkUpdateTransactionCategory({transactionRepo: repo});

    const result = await execute({
      ids: ['txn-1', 'missing'],
      categoryId: 'new-cat',
    });

    expect(result.updatedIds).toEqual(['txn-1']);
    expect(result.failed).toEqual([{id: 'missing', reason: 'Transaction not found'}]);
  });
});
