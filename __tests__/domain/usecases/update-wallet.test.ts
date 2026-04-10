import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {makeUpdateWallet} from '@domain/usecases/update-wallet';

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

const existingWallet = {
  id: 'w-1',
  currency: 'USD',
  name: 'Checking',
  balance: 5000,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 0,
  createdAt: 100,
  updatedAt: 100,
};

describe('makeUpdateWallet', () => {
  it('updates when wallet exists and currency unchanged', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findById.mockResolvedValue(existingWallet);
    walletRepo.update.mockResolvedValue(undefined);

    const execute = makeUpdateWallet({walletRepo});
    const result = await execute('w-1', {
      name: 'New Name',
      currency: 'USD',
      icon: 'bank',
      color: '#00B894',
    });

    expect(result.name).toBe('New Name');
    expect(result.icon).toBe('bank');
    expect(result.color).toBe('#00B894');
    expect(result.balance).toBe(5000);
    expect(walletRepo.update).toHaveBeenCalledTimes(1);
  });

  it('allows currency change freely', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findById.mockResolvedValue(existingWallet);
    walletRepo.update.mockResolvedValue(undefined);

    const execute = makeUpdateWallet({walletRepo});
    const result = await execute('w-1', {
      name: 'Checking',
      currency: 'EUR',
      icon: 'wallet',
      color: '#112233',
    });

    expect(result.currency).toBe('EUR');
    expect(walletRepo.update).toHaveBeenCalled();
  });

  it('rejects when wallet id is unknown', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findById.mockResolvedValue(null);

    const execute = makeUpdateWallet({walletRepo});

    await expect(
      execute('missing', {
        name: 'X',
        currency: 'USD',
        icon: 'wallet',
        color: '#112233',
      }),
    ).rejects.toThrow('Wallet not found');
    expect(walletRepo.update).not.toHaveBeenCalled();
  });

  it('allows multiple wallets with the same currency', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findById.mockResolvedValue(existingWallet);
    walletRepo.update.mockResolvedValue(undefined);

    const execute = makeUpdateWallet({walletRepo});
    await execute('w-1', {
      name: 'Checking',
      currency: 'USD',
      icon: 'wallet',
      color: '#112233',
    });

    expect(walletRepo.update).toHaveBeenCalled();
  });
});
