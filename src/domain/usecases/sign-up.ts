import type {IAuthRepository, AuthResult} from '@domain/repositories/IAuthRepository';

type Deps = {
  authRepo: IAuthRepository;
};

export function makeSignUp({authRepo}: Deps) {
  return async (email: string, password: string, fullName: string): Promise<AuthResult> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Email is required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!fullName.trim()) {
      throw new Error('Full name is required');
    }

    return authRepo.signUp(trimmedEmail, password, fullName.trim());
  };
}
