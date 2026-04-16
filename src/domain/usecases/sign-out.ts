import type {IAuthRepository} from '@domain/repositories/IAuthRepository';

type Deps = {
  authRepo: IAuthRepository;
};

export function makeSignOut({authRepo}: Deps) {
  return async (): Promise<void> => {
    const token = await authRepo.getStoredToken();
    if (!token) {
      return;
    }
    await authRepo.signOut(token);
  };
}
