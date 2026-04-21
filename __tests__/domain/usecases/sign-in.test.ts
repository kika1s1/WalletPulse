import {makeSignIn} from '@domain/usecases/sign-in';
import type {IAuthRepository} from '@domain/repositories/IAuthRepository';
import type {User} from '@domain/entities/User';
import type {Session} from '@domain/entities/Session';

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

const mockSession: Session = {
  id: 's-1',
  userId: 'u-1',
  token: 'tok-123',
  expiresAt: 1_700_000_000_000 + 30 * 24 * 60 * 60 * 1000,
  createdAt: 1_700_000_000_000,
};

describe('makeSignIn', () => {
  it('calls authRepo.signIn and returns user + session', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.signIn.mockResolvedValue({user: mockUser, session: mockSession});
    const execute = makeSignIn({authRepo});

    const result = await execute('test@example.com', 'password123');

    expect(authRepo.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(result.user.id).toBe('u-1');
    expect(result.session.userId).toBe('u-1');
  });

  it('throws for empty email', async () => {
    const authRepo = createMockAuthRepo();
    const execute = makeSignIn({authRepo});

    await expect(execute('', 'password123')).rejects.toThrow('Email is required');
    expect(authRepo.signIn).not.toHaveBeenCalled();
  });

  it('throws for empty password', async () => {
    const authRepo = createMockAuthRepo();
    const execute = makeSignIn({authRepo});

    await expect(execute('test@example.com', '')).rejects.toThrow('Password is required');
    expect(authRepo.signIn).not.toHaveBeenCalled();
  });

  it('propagates invalid credentials error', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.signIn.mockRejectedValue(new Error('Invalid email or password'));
    const execute = makeSignIn({authRepo});

    await expect(execute('test@example.com', 'wrong')).rejects.toThrow(
      'Invalid email or password',
    );
  });
});
