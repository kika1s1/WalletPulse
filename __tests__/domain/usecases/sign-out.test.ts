import {makeSignOut} from '@domain/usecases/sign-out';
import type {IAuthRepository} from '@domain/repositories/IAuthRepository';

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
  };
}

describe('makeSignOut', () => {
  it('reads stored token and calls signOut', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue('tok-123');
    authRepo.signOut.mockResolvedValue(undefined);
    const execute = makeSignOut({authRepo});

    await execute();

    expect(authRepo.getStoredToken).toHaveBeenCalled();
    expect(authRepo.signOut).toHaveBeenCalledWith('tok-123');
  });

  it('does nothing when no stored token exists', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue(null);
    const execute = makeSignOut({authRepo});

    await execute();

    expect(authRepo.signOut).not.toHaveBeenCalled();
  });

  it('propagates signOut errors', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.getStoredToken.mockResolvedValue('tok-123');
    authRepo.signOut.mockRejectedValue(new Error('Network error'));
    const execute = makeSignOut({authRepo});

    await expect(execute()).rejects.toThrow('Network error');
  });
});
