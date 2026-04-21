import {makeSignUp} from '@domain/usecases/sign-up';
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

describe('makeSignUp', () => {
  it('calls authRepo.signUp with correct args and returns result', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.signUp.mockResolvedValue({user: mockUser, session: mockSession});
    const execute = makeSignUp({authRepo});

    const result = await execute('test@example.com', 'password123', 'Test User');

    expect(authRepo.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    expect(result.user.email).toBe('test@example.com');
    expect(result.session.token).toBe('tok-123');
  });

  it('throws for empty email', async () => {
    const authRepo = createMockAuthRepo();
    const execute = makeSignUp({authRepo});

    await expect(execute('', 'password123', 'Test')).rejects.toThrow('Email is required');
    expect(authRepo.signUp).not.toHaveBeenCalled();
  });

  it('throws for short password', async () => {
    const authRepo = createMockAuthRepo();
    const execute = makeSignUp({authRepo});

    await expect(execute('test@example.com', 'short', 'Test')).rejects.toThrow(
      'Password must be at least 8 characters',
    );
    expect(authRepo.signUp).not.toHaveBeenCalled();
  });

  it('throws for empty full name', async () => {
    const authRepo = createMockAuthRepo();
    const execute = makeSignUp({authRepo});

    await expect(execute('test@example.com', 'password123', '')).rejects.toThrow(
      'Full name is required',
    );
    expect(authRepo.signUp).not.toHaveBeenCalled();
  });

  it('propagates repo errors', async () => {
    const authRepo = createMockAuthRepo();
    authRepo.signUp.mockRejectedValue(new Error('Email already exists'));
    const execute = makeSignUp({authRepo});

    await expect(execute('test@example.com', 'password123', 'Test')).rejects.toThrow(
      'Email already exists',
    );
  });
});
