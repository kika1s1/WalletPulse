import type {CreateWalletInput} from '@domain/entities/Wallet';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {makeCreateWallet} from '@domain/usecases/create-wallet';

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

const validInput: CreateWalletInput = {
  id: 'w-new',
  currency: 'USD',
  name: 'Checking',
  balance: 0,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 0,
  createdAt: 100,
  updatedAt: 100,
};

describe('makeCreateWallet', () => {
  it('creates and returns a wallet when currency is free', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findByCurrency.mockResolvedValue(null);
    walletRepo.save.mockResolvedValue(undefined);

    const execute = makeCreateWallet({walletRepo});
    const wallet = await execute(validInput);

    expect(wallet.id).toBe('w-new');
    expect(wallet.currency).toBe('USD');
    expect(wallet.name).toBe('Checking');
    expect(walletRepo.findByCurrency).toHaveBeenCalledWith('USD');
    expect(walletRepo.save).toHaveBeenCalledTimes(1);
    expect(walletRepo.save).toHaveBeenCalledWith(wallet);
  });

  it('rejects when a wallet for the same currency already exists', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findByCurrency.mockResolvedValue({
      id: 'w-existing',
      currency: 'USD',
      name: 'Old',
      balance: 0,
      isActive: true,
      icon: 'wallet',
      color: '#000000',
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    });

    const execute = makeCreateWallet({walletRepo});

    await expect(execute(validInput)).rejects.toThrow(
      'A wallet for this currency already exists',
    );
    expect(walletRepo.save).not.toHaveBeenCalled();
  });

  it('persists the validated wallet via save', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.findByCurrency.mockResolvedValue(null);
    walletRepo.save.mockResolvedValue(undefined);

    const execute = makeCreateWallet({walletRepo});
    await execute(validInput);

    const saved = walletRepo.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      id: 'w-new',
      currency: 'USD',
      name: 'Checking',
      balance: 0,
      isActive: true,
    });
  });
});
