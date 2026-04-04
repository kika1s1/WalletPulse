import {makeUpdateTransaction} from '@domain/usecases/update-transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {Transaction} from '@domain/entities/Transaction';
import type {Wallet} from '@domain/entities/Wallet';

function createMockTransactionRepo(): jest.Mocked<ITransactionRepository> {
  return {
    findById: jest.fn(),
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

function createMockWalletRepo(): jest.Mocked<IWalletRepository> {
  return {
    findById: jest.fn(),
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

const existingTxn: Transaction = {
  id: 'txn-1',
  walletId: 'w1',
  categoryId: 'cat-1',
  amount: 2000,
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

describe('makeUpdateTransaction', () => {
  it('updates a transaction and persists changes', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue({...existingTxn});
    const walletRepo = createMockWalletRepo();
    walletRepo.findById.mockResolvedValue({...baseWallet, balance: 8000});
    const execute = makeUpdateTransaction({transactionRepo, walletRepo});

    const result = await execute({
      id: 'txn-1',
      amount: 2000,
      description: 'Updated note',
    });

    expect(result.description).toBe('Updated note');
    expect(transactionRepo.update).toHaveBeenCalledTimes(1);
    expect(transactionRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({id: 'txn-1', description: 'Updated note'}),
    );
  });

  it('recalculates wallet balance when amount changes on same wallet', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue({...existingTxn});
    const walletRepo = createMockWalletRepo();
    walletRepo.findById.mockResolvedValue({...baseWallet, balance: 8000});
    const execute = makeUpdateTransaction({transactionRepo, walletRepo});

    await execute({
      id: 'txn-1',
      amount: 5000,
    });

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 5000);
  });

  it('throws when transaction is not found', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo();
    const execute = makeUpdateTransaction({transactionRepo, walletRepo});

    await expect(execute({id: 'missing', amount: 100})).rejects.toThrow(
      'Transaction not found',
    );

    expect(transactionRepo.update).not.toHaveBeenCalled();
    expect(walletRepo.updateBalance).not.toHaveBeenCalled();
  });
});
