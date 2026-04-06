import {makeCreateWalletTransfer} from '@domain/usecases/create-wallet-transfer';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {Wallet} from '@domain/entities/Wallet';
import {parseWalletTransferMeta} from '@domain/value-objects/WalletTransferNotes';

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

function createMockWalletRepo(
  wallets: Record<string, Wallet>,
): jest.Mocked<IWalletRepository> {
  const repo: jest.Mocked<IWalletRepository> = {
    findById: jest.fn(async (id: string) => wallets[id] ?? null),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findByCurrency: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateBalance: jest.fn(async (id: string, next: number) => {
      const w = wallets[id];
      if (w) {
        w.balance = next;
      }
    }),
  };
  return repo;
}

const wUsd: Wallet = {
  id: 'w-usd',
  currency: 'USD',
  name: 'USD Wallet',
  balance: 10_000,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
};

const wEur: Wallet = {
  id: 'w-eur',
  currency: 'EUR',
  name: 'EUR Wallet',
  balance: 5_000,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 1,
  createdAt: 1,
  updatedAt: 1,
};

describe('makeCreateWalletTransfer', () => {
  it('creates two transfer rows with cross-references and updates both balances', async () => {
    const wallets: Record<string, Wallet> = {
      'w-usd': {...wUsd, balance: 10_000},
      'w-eur': {...wEur, balance: 5_000},
    };
    const transactionRepo = createMockTransactionRepo();
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const walletRepo = createMockWalletRepo(wallets);
    const execute = makeCreateWalletTransfer({transactionRepo, walletRepo});

    const [outTxn, inTxn] = await execute({
      fromWalletId: 'w-usd',
      toWalletId: 'w-eur',
      fromWalletCurrency: 'USD',
      toWalletCurrency: 'EUR',
      amountFromCents: 3_000,
      amountToCents: 2_700,
      categoryId: 'cat-transfer',
      transactionDate: 1_704_000_000_000,
      userNotes: 'Between accounts',
      fromWalletName: 'USD Wallet',
      toWalletName: 'EUR Wallet',
    });

    expect(transactionRepo.save).toHaveBeenCalledTimes(2);
    expect(outTxn.walletId).toBe('w-usd');
    expect(outTxn.amount).toBe(3_000);
    expect(outTxn.currency).toBe('USD');
    expect(inTxn.walletId).toBe('w-eur');
    expect(inTxn.amount).toBe(2_700);
    expect(inTxn.currency).toBe('EUR');

    const metaOut = parseWalletTransferMeta(outTxn.notes);
    const metaIn = parseWalletTransferMeta(inTxn.notes);
    expect(metaOut?.leg).toBe('source');
    expect(metaOut?.peerId).toBe(inTxn.id);
    expect(metaIn?.leg).toBe('destination');
    expect(metaIn?.peerId).toBe(outTxn.id);

    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w-usd', 7_000);
    expect(walletRepo.updateBalance).toHaveBeenCalledWith('w-eur', 7_700);
  });

  it('rejects same wallet', async () => {
    const transactionRepo = createMockTransactionRepo();
    const walletRepo = createMockWalletRepo({'w-usd': {...wUsd}});
    transactionRepo.findBySourceHash.mockResolvedValue(null);
    const execute = makeCreateWalletTransfer({transactionRepo, walletRepo});

    await expect(
      execute({
        fromWalletId: 'w-usd',
        toWalletId: 'w-usd',
        fromWalletCurrency: 'USD',
        toWalletCurrency: 'USD',
        amountFromCents: 100,
        amountToCents: 100,
        categoryId: 'c',
        transactionDate: 1,
      }),
    ).rejects.toThrow('same wallet');
  });
});
