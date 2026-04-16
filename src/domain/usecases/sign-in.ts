import type {IAuthRepository, AuthResult} from '@domain/repositories/IAuthRepository';

type Deps = {
  authRepo: IAuthRepository;
};

export function makeSignIn({authRepo}: Deps) {
  return async (email: string, password: string): Promise<AuthResult> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Email is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }

    return authRepo.signIn(trimmedEmail, password);
  };
}
