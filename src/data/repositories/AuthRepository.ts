import type {SupabaseClient} from '@supabase/supabase-js';
import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';
import type {User} from '@domain/entities/User';
import type {Session} from '@domain/entities/Session';
import {SESSION_DURATION_MS} from '@domain/entities/Session';
import type {
  IAuthRepository,
  AuthResult,
  UpdateProfileFields,
} from '@domain/repositories/IAuthRepository';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateToken,
} from '@shared/utils/crypto';

const KEYCHAIN_SERVICE = 'com.walletpulse.auth';

function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: row.full_name as string,
    avatarUrl: (row.avatar_url as string) ?? '',
    address: (row.address as string) ?? '',
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

function mapRowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    token: row.token as string,
    expiresAt: new Date(row.expires_at as string).getTime(),
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

export class AuthRepository implements IAuthRepository {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const {data: existing} = await this.supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const now = new Date().toISOString();

    const {data: userRow, error: insertError} = await this.supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: fullName.trim(),
        avatar_url: '',
        address: '',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError || !userRow) {
      throw new Error(insertError?.message ?? 'Failed to create account');
    }

    const user = mapRowToUser(userRow);
    const session = await this.createSession(user.id);

    return {user, session};
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();

    const {data: userRow, error} = await this.supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !userRow) {
      throw new Error('Invalid email or password');
    }

    const isValid = verifyPassword(password, userRow.password_hash as string);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const user = mapRowToUser(userRow);
    const session = await this.createSession(user.id);

    return {user, session};
  }

  async signOut(token: string): Promise<void> {
    await this.supabase.from('sessions').delete().eq('token', token);
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
  }

  async getCurrentUser(token: string): Promise<User | null> {
    const {data: sessionRow} = await this.supabase
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!sessionRow) {
      await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
      return null;
    }

    const {data: userRow} = await this.supabase
      .from('users')
      .select('*')
      .eq('id', sessionRow.user_id)
      .maybeSingle();

    if (!userRow) {
      return null;
    }

    return mapRowToUser(userRow);
  }

  async updateProfile(userId: string, fields: UpdateProfileFields): Promise<User> {
    const updates: Record<string, unknown> = {updated_at: new Date().toISOString()};
    if (fields.fullName !== undefined) {
      updates.full_name = fields.fullName.trim();
    }
    if (fields.avatarUrl !== undefined) {
      updates.avatar_url = fields.avatarUrl;
    }
    if (fields.address !== undefined) {
      updates.address = fields.address.trim();
    }

    const {data: userRow, error} = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !userRow) {
      throw new Error(error?.message ?? 'Failed to update profile');
    }

    return mapRowToUser(userRow);
  }

  async getStoredToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
    if (!credentials) {
      return null;
    }
    return credentials.password;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await this.callEdgeFunction('send-reset-email', {
      email: normalizedEmail,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as Record<string, string>).error ?? 'Failed to send reset email',
      );
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const response = await this.callEdgeFunction('reset-password', {
      email: email.trim().toLowerCase(),
      code: code.trim(),
      new_password: newPassword,
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error((body.error as string) ?? 'Failed to reset password');
    }
  }

  // Edge Functions are deployed with verify_jwt: false but the Supabase gateway
  // still requires the anon key in the Authorization header for the request to
  // route through — without it you get a 401 from the gateway, not the function.
  private async callEdgeFunction(
    slug: string,
    body: Record<string, unknown>,
  ): Promise<Response> {
    const baseUrl = Config.SUPABASE_URL;
    const anonKey = Config.SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    return fetch(`${baseUrl}/functions/v1/${slug}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const {data: userRow, error} = await this.supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle();

    if (error || !userRow) {
      throw new Error('User not found');
    }

    const isValid = verifyPassword(currentPassword, userRow.password_hash as string);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const salt = generateSalt();
    const newHash = hashPassword(newPassword, salt);

    const {error: updateError} = await this.supabase
      .from('users')
      .update({password_hash: newHash, updated_at: new Date().toISOString()})
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    const {error} = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId);
    if (error) {
      throw new Error(error.message);
    }
  }

  private async createSession(userId: string): Promise<Session> {
    const token = generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    const {data: sessionRow, error} = await this.supabase
      .from('sessions')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (error || !sessionRow) {
      throw new Error(error?.message ?? 'Failed to create session');
    }

    await Keychain.setGenericPassword('session', token, {service: KEYCHAIN_SERVICE});

    return mapRowToSession(sessionRow);
  }
}
