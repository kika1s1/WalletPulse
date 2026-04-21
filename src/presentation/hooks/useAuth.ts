import {useEffect} from 'react';
import {useAuthStore} from '@presentation/stores/useAuthStore';

export function useAuth() {
  const store = useAuthStore();
  const {isInitialized, initialize} = store;

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return store;
}
