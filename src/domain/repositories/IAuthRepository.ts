import type {User} from '@domain/entities/User';
import type {Session} from '@domain/entities/Session';

export type AuthResult = {
  user: User;
  session: Session;
};

export type UpdateProfileFields = {
  fullName?: string;
  avatarUrl?: string;
};

export interface IAuthRepository {
  signUp(email: string, password: string, fullName: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(token: string): Promise<void>;
  getCurrentUser(token: string): Promise<User | null>;
  updateProfile(userId: string, fields: UpdateProfileFields): Promise<User>;
  getStoredToken(): Promise<string | null>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}
