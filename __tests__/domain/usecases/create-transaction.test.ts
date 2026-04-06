import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {CreateTransactionInput} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';
import {buildWalletTransferNotes} from '@domain/value-objects/WalletTransferNotes';

function createMockTransactionRepo(): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByWalletId: jest.fn(),
    findByCategoryId: jest.fn(),
    findBySourceHash: jest.fn(),
    findRecent: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn(),
    delete: jest.fn(),
    countByFilter: jest.fn(),
    sumByFilter: jest.fn(),
  };
}

function createMockWalletRepo(wallet: Wallet | null): jest.Mocked<IWalletRepository> {
  return {
    findById: jest.fn().mockResolvedValue(wallet),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateBalance: jest.fn().mockResolvedValue(undefined),
  };
}

const baseWallet: Wallet = {
  id: 'w1',
  currency: 'USD',
  name: 'Main',
  balance: 10000,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
};

const baseInput: CreateTransactionInput = {
  id: 'txn-1',
  walletId: 'w1',
  categoryId: 'cat-1',
  amount: 2500,
  currency: 'USD',
  type: 'expense',
  source: 'manual',
  transactionDate: 1_704_000_000_000,
  createdAt: 1_704_000_000_000,
  updatedAt: 1_704_000_000_000,
};

describe('makeCreateTransaction', () => {
  it('creates a transaction and persists it', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo({...baseWallet});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    const result = await execute(baseInput);

    expect(result.id).toBe('txn-1');
    expect(transactionRepo.save).toHaveBeenCalledTimes(1);
    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({id: 'txn-1', walletId: 'w1'}),
    );
  });

  it('updates wallet balance for income by adding amount', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo({...baseWallet, balance: 10000});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await execute({
      ...baseInput,
      id: 'txn-inc',
      type: 'income',
      amount: 3000,
    });

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 13000);
  });

  it('updates wallet balance for expense by subtracting amount', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo({...baseWallet, balance: 10000});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await execute({
      ...baseInput,
      id: 'txn-exp',
      type: 'expense',
      amount: 4000,
    });

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 6000);
  });

  it('rejects duplicate when sourceHash is set and already exists', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue({
      ...baseInput,
      id: 'existing',
      description: '',
      merchant: '',
      sourceHash: 'hash-1',
      tags: [],
      receiptUri: '',
      isRecurring: false,
      recurrenceRule: '',
      confidence: 1,
      notes: '',
      isTemplate: false,
      templateName: '',
    });
    const walletRepo = createMockWalletRepo({...baseWallet});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await expect(
      execute({
        ...baseInput,
        id: 'txn-dup',
        source: 'grey',
        sourceHash: 'hash-1',
      }),
    ).rejects.toThrow('Duplicate transaction for source hash');

    expect(transactionRepo.save).not.toHaveBeenCalled();
    expect(walletRepo.updateBalance).not.toHaveBeenCalled();
  });

  it('still saves transaction when wallet is not found', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo(null);
    walletRepo.findById.mockResolvedValue(null);
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await execute(baseInput);

    expect(transactionRepo.save).toHaveBeenCalledTimes(1);
    expect(walletRepo.updateBalance).not.toHaveBeenCalled();
  });

  it('subtracts amount for transfer from the transaction wallet (legacy, no pair marker)', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo({...baseWallet, balance: 20000});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await execute({
      ...baseInput,
      id: 'txn-tr',
      type: 'transfer',
      amount: 5000,
    });

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 15000);
  });

  it('adds amount for paired transfer destination leg', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo({...baseWallet, balance: 20000});
    const execute = makeCreateTransaction({transactionRepo, walletRepo});

    await execute({
      ...baseInput,
      id: 'txn-tr-in',
      type: 'transfer',
      amount: 5000,
      notes: buildWalletTransferNotes('txn-tr-out', 'destination', ''),
    });

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 25000);
  });
});
