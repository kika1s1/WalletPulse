import {makeDeleteTransaction} from '@domain/usecases/delete-transaction';
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
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
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
  balance: 8000,
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

describe('makeDeleteTransaction', () => {
  it('deletes a transaction after reversing wallet impact', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue({...existingTxn});
    const walletRepo = createMockWalletRepo();
    walletRepo.findById.mockResolvedValue({...baseWallet});
    const execute = makeDeleteTransaction({transactionRepo, walletRepo});

    await execute('txn-1');

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 10000);
    expect(transactionRepo.delete).toHaveBeenCalledWith('txn-1');
  });

  it('reverses income by subtracting amount from wallet', async () => {
    const incomeTxn: Transaction = {...existingTxn, type: 'income', amount: 3000};
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue(incomeTxn);
    const walletRepo = createMockWalletRepo();
    walletRepo.findById.mockResolvedValue({...baseWallet, balance: 13000});
    const execute = makeDeleteTransaction({transactionRepo, walletRepo});

    await execute('txn-1');

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w1', 10000);
  });

  it('throws when transaction is not found', async () => {
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findById.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo();
    const execute = makeDeleteTransaction({transactionRepo, walletRepo});

    await expect(execute('missing')).rejects.toThrow('Transaction not found');

    expect(transactionRepo.delete).not.toHaveBeenCalled();
    expect(walletRepo.updateBalance).not.toHaveBeenCalled();
  });
});
