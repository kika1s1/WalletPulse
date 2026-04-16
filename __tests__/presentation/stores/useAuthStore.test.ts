import {useAuthStore} from '@presentation/stores/useAuthStore';
import type {User} from '@domain/entities/User';
import type {Session} from '@domain/entities/Session';

const mockUser: User = {
  id: 'u-1',
  email: 'test@example.com',
  fullName: 'Test User',
  avatarUrl: '',
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

jest.mock('@data/datasources/supabase-client', () => ({
  getSupabaseClient: jest.fn(),
}));
jest.mock('@data/repositories/AuthRepository', () => ({
  AuthRepository: jest.fn().mockImplementation(() => ({
    signUp: jest.fn().mockResolvedValue({user: mockUser, session: mockSession}),
    signIn: jest.fn().mockResolvedValue({user: mockUser, session: mockSession}),
    signOut: jest.fn().mockResolvedValue(undefined),
    getCurrentUser: jest.fn().mockResolvedValue(mockUser),
    updateProfile: jest.fn().mockResolvedValue(mockUser),
    getStoredToken: jest.fn().mockResolvedValue('tok-123'),
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
  })),
}));

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,
  });
});

describe('useAuthStore', () => {
  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('signIn sets user and session', async () => {
    await useAuthStore.getState().signIn('test@example.com', 'password123');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.error).toBeNull();
  });

  it('signUp sets user and session', async () => {
    await useAuthStore.getState().signUp('test@example.com', 'password123', 'Test User');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('test@example.com');
  });

  it('signOut clears user and session', async () => {
    await useAuthStore.getState().signIn('test@example.com', 'password123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });

  it('clearError resets error', () => {
    useAuthStore.setState({error: 'Some error'});
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('initialize restores session from stored token', async () => {
    await useAuthStore.getState().initialize();
    const state = useAuthStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('changePassword completes without clearing session', async () => {
    await useAuthStore.getState().signIn('test@example.com', 'password123');
    await useAuthStore.getState().changePassword('oldpass', 'newpass123');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it('deleteAccount clears user and session', async () => {
    await useAuthStore.getState().signIn('test@example.com', 'password123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().deleteAccount();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });
});
