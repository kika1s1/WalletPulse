import {makeGetCurrentUser} from '@domain/usecases/get-current-user';
import type {IAuthRepository} from '@domain/repositories/IAuthRepository';
import type {User} from '@domain/entities/User';

function createMockAuthRepo(): jest.Mocked<IAuthRepository> {
  return {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
    getStoredToken: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  };
}

const mockUser: User = {
  id: 'u-1',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: '',
  address: '',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe('makeGetCurrentUser', () => {
  it('returns user when valid token exists', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue('tok-123');
    authRepo.getCurrentUser.mockResolvedValue(mockUser);
    const execute = makeGetCurrentUser({authRepo});

    const user = await execute();

    expect(authRepo.getStoredToken).toHaveBeenCalled();
    expect(authRepo.getCurrentUser).toHaveBeenCalledWith('tok-123');
    expect(user).toEqual(mockUser);
  });

  it('returns null when no stored token', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue(null);
    const execute = makeGetCurrentUser({authRepo});

    const user = await execute();

    expect(user).toBeNull();
    expect(authRepo.getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns null when token is expired (getCurrentUser returns null)', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue('tok-expired');
    authRepo.getCurrentUser.mockResolvedValue(null);
    const execute = makeGetCurrentUser({authRepo});

    const user = await execute();

    expect(user).toBeNull();
  });
});
