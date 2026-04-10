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
  it('creates and returns a wallet', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.save.mockResolvedValue(undefined);

    const execute = makeCreateWallet({walletRepo});
    const wallet = await execute(validInput);

    expect(wallet.id).toBe('w-new');
    expect(wallet.currency).toBe('USD');
    expect(wallet.name).toBe('Checking');
    expect(walletRepo.save).toHaveBeenCalledTimes(1);
    expect(walletRepo.save).toHaveBeenCalledWith(wallet);
  });

  it('allows multiple wallets with the same currency', async () => {
    const walletRepo = createWalletRepoMock();
    walletRepo.save.mockResolvedValue(undefined);

    const execute = makeCreateWallet({walletRepo});
    const wallet = await execute(validInput);

    expect(wallet.currency).toBe('USD');
    expect(walletRepo.save).toHaveBeenCalledTimes(1);
  });

  it('persists the validated wallet via save', async () => {
    const walletRepo = createWalletRepoMock();
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
