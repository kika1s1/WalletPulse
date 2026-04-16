import type {IAuthRepository} from '@domain/repositories/IAuthRepository';
import type {User} from '@domain/entities/User';

type Deps = {
  authRepo: IAuthRepository;
};

export function makeGetCurrentUser({authRepo}: Deps) {
  return async (): Promise<User | null> => {
    const token = await authRepo.getStoredToken();
    if (!token) {
      return null;
    }
    return authRepo.getCurrentUser(token);
  };
}
