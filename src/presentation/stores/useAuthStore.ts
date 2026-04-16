import {create} from 'zustand';
import type {User} from '@domain/entities/User';
import type {Session} from '@domain/entities/Session';
import type {UpdateProfileFields} from '@domain/repositories/IAuthRepository';
import {AuthRepository} from '@data/repositories/AuthRepository';
import {getSupabaseClient} from '@data/datasources/supabase-client';

function getRepo(): AuthRepository {
  return new AuthRepository(getSupabaseClient());
}

type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (fields: UpdateProfileFields) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      const {user, session} = await repo.signIn(email, password);
      set({user, session, isAuthenticated: true, isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      set({isLoading: false, error: message});
      throw err;
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      const {user, session} = await repo.signUp(email, password, fullName);
      set({user, session, isAuthenticated: true, isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      set({isLoading: false, error: message});
      throw err;
    }
  },

  signOut: async () => {
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      const token = await repo.getStoredToken();
      if (token) {
        await repo.signOut(token);
      }
      set({user: null, session: null, isAuthenticated: false, isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      set({isLoading: false, error: message});
    }
  },

  initialize: async () => {
    set({isLoading: true});
    try {
      const repo = getRepo();
      const token = await repo.getStoredToken();
      if (token) {
        const user = await repo.getCurrentUser(token);
        if (user) {
          set({user, isAuthenticated: true, isLoading: false, isInitialized: true});
          return;
        }
      }
      set({isAuthenticated: false, isLoading: false, isInitialized: true});
    } catch {
      set({isAuthenticated: false, isLoading: false, isInitialized: true});
    }
  },

  updateProfile: async (fields: UpdateProfileFields) => {
    const {user} = get();
    if (!user) {
      return;
    }
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      const updated = await repo.updateProfile(user.id, fields);
      set({user: updated, isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      set({isLoading: false, error: message});
      throw err;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const {user} = get();
    if (!user) { return; }
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      await repo.changePassword(user.id, currentPassword, newPassword);
      set({isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed';
      set({isLoading: false, error: message});
      throw err;
    }
  },

  deleteAccount: async () => {
    const {user} = get();
    if (!user) { return; }
    set({isLoading: true, error: null});
    try {
      const repo = getRepo();
      await repo.deleteAccount(user.id);
      set({user: null, session: null, isAuthenticated: false, isLoading: false});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account deletion failed';
      set({isLoading: false, error: message});
      throw err;
    }
  },

  clearError: () => set({error: null}),
}));
