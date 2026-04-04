import type {Transaction} from '@domain/entities/Transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {makeCalculateWalletBalance} from '@domain/usecases/calculate-wallet-balance';

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

function createWalletRepoMock(): jest.Mocked<IWalletRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateBalance: jest.fn(),
  };
}

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount'>): Transaction {
  return {
    walletId: 'w1',
    categoryId: 'c1',
    currency: 'USD',
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
    transactionDate: 1,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  } as Transaction;
}

describe('makeCalculateWalletBalance', () => {
  it('sums income and subtracts expenses for a wallet', async () => {
    const transactionRepo = createTransactionRepoMock();
    const walletRepo = createWalletRepoMock();
    transactionRepo.findByWalletId.mockResolvedValue([
      tx({id: 't1', type: 'income', amount: 10_000}),
      tx({id: 't2', type: 'expense', amount: 3_000}),
      tx({id: 't3', type: 'income', amount: 2_000}),
    ]);
    walletRepo.updateBalance.mockResolvedValue(undefined);

    const execute = makeCalculateWalletBalance({transactionRepo, walletRepo});
    const balance = await execute('w1');

    expect(balance).toBe(9_000);
    expect(walletRepo.updateBalance).not.toHaveBeenCalled();
  });

  it('returns 0 when the wallet has no transactions', async () => {
    const transactionRepo = createTransactionRepoMock();
    const walletRepo = createWalletRepoMock();
    transactionRepo.findByWalletId.mockResolvedValue([]);

    const execute = makeCalculateWalletBalance({transactionRepo, walletRepo});
    const balance = await execute('empty-wallet');

    expect(balance).toBe(0);
  });

  it('subtracts transfer amounts like outflows from the wallet', async () => {
    const transactionRepo = createTransactionRepoMock();
    const walletRepo = createWalletRepoMock();
    transactionRepo.findByWalletId.mockResolvedValue([
      tx({id: 't1', type: 'income', amount: 5_000}),
      tx({id: 't2', type: 'transfer', amount: 2_000}),
    ]);

    const execute = makeCalculateWalletBalance({transactionRepo, walletRepo});
    const balance = await execute('w1');

    expect(balance).toBe(3_000);
  });

  it('calls updateBalance when persistBalance is true', async () => {
    const transactionRepo = createTransactionRepoMock();
    const walletRepo = createWalletRepoMock();
    transactionRepo.findByWalletId.mockResolvedValue([
      tx({id: 't1', type: 'income', amount: 1_000}),
    ]);
    walletRepo.updateBalance.mockResolvedValue(undefined);

    const execute = makeCalculateWalletBalance({transactionRepo, walletRepo});
    const balance = await execute('w1', {persistBalance: true});

    expect(balance).toBe(1_000);
    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 1_000);
  });
});
