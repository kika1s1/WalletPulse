import {makeBulkUpdateTransactionTags} from '@domain/usecases/bulk-update-transaction-tags';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {Transaction} from '@domain/entities/Transaction';

function transaction(id: string, tags: string[]): Transaction {
  return {
    id,
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    amount: 1200,
    currency: 'USD',
    type: 'expense',
    description: '',
    merchant: '',
    source: 'manual',
    sourceHash: '',
    tags,
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

describe('makeBulkUpdateTransactionTags', () => {
  it('adds normalized tags without duplicating existing tags', async () => {
    const repo = createRepo({'txn-1': transaction('txn-1', ['food'])});
    const execute = makeBulkUpdateTransactionTags({transactionRepo: repo});

    const result = await execute({
      ids: ['txn-1'],
      mode: 'add',
      tags: ['Food', ' Work Trip '],
    });

    expect(result.updatedIds).toEqual(['txn-1']);
    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'txn-1',
      tags: ['food', 'work trip'],
    }));
  });

  it('removes normalized tags from selected transactions', async () => {
    const repo = createRepo({'txn-1': transaction('txn-1', ['food', 'work trip'])});
    const execute = makeBulkUpdateTransactionTags({transactionRepo: repo});

    await execute({
      ids: ['txn-1'],
      mode: 'remove',
      tags: ['WORK TRIP'],
    });

    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'txn-1',
      tags: ['food'],
    }));
  });

  it('replaces existing tags with normalized tags', async () => {
    const repo = createRepo({'txn-1': transaction('txn-1', ['food'])});
    const execute = makeBulkUpdateTransactionTags({transactionRepo: repo});

    await execute({
      ids: ['txn-1'],
      mode: 'replace',
      tags: ['Travel', 'CLIENT A'],
    });

    expect(repo.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'txn-1',
      tags: ['travel', 'client a'],
    }));
  });
});
