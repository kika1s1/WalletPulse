import {createTransaction, type CreateTransactionInput} from '@domain/entities/Transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import {generateTransactionHash} from '@domain/value-objects/TransactionHash';
import {makeDetectDuplicates} from '@domain/usecases/detect-duplicates';

const baseTxInput: CreateTransactionInput = {
  id: 'tx-1',
  walletId: 'w1',
  categoryId: 'c1',
  amount: 1_500,
  currency: 'USD',
  type: 'expense',
  source: 'payoneer',
  transactionDate: 1_704_067_200_000,
  createdAt: 1,
  updatedAt: 2,
};

function createTransactionRepoMock(): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWalletId: jest.fn(),
    findByCategoryId: jest.fn(),
    findBySourceHash: jest.fn(),
    findRecent: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByFilter: jest.fn(),
    sumByFilter: jest.fn(),
  };
}

describe('makeDetectDuplicates', () => {
  it('returns isDuplicate false and null transaction when no hash match', async () => {
    const transactionRepo = createTransactionRepoMock();
    transactionRepo.findBySourceHash.mockResolvedValue(null);

    const run = makeDetectDuplicates({transactionRepo});
    const result = await run({
      amount: 1_500,
      currency: 'USD',
      timestampMs: 1_704_067_200_000,
      source: 'payoneer',
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.existingTransaction).toBeNull();
    expect(transactionRepo.findBySourceHash).toHaveBeenCalledTimes(1);
  });

  it('returns isDuplicate true when an existing transaction matches the hash', async () => {
    const existing = createTransaction({
      ...baseTxInput,
      sourceHash: generateTransactionHash(1_500, 'USD', 1_704_067_200_000, 'payoneer'),
    });
    const transactionRepo = createTransactionRepoMock();
    transactionRepo.findBySourceHash.mockResolvedValue(existing);

    const run = makeDetectDuplicates({transactionRepo});
    const result = await run({
      amount: 1_500,
      currency: 'USD',
      timestampMs: 1_704_067_200_000,
      source: 'payoneer',
    });

    expect(result.isDuplicate).toBe(true);
    expect(result.existingTransaction).toEqual(existing);
  });

  it('uses generateTransactionHash for the value passed to the repository', async () => {
    const transactionRepo = createTransactionRepoMock();
    transactionRepo.findBySourceHash.mockResolvedValue(null);

    const run = makeDetectDuplicates({transactionRepo});
    const input = {
      amount: 2_000,
      currency: 'eur',
      timestampMs: 1_704_067_200_001,
      source: 'grey' as const,
    };
    const expectedHash = generateTransactionHash(
      input.amount,
      input.currency,
      input.timestampMs,
      input.source,
    );

    const result = await run(input);

    expect(result.hash).toBe(expectedHash);
    expect(transactionRepo.findBySourceHash).toHaveBeenCalledWith(expectedHash);
  });
});
