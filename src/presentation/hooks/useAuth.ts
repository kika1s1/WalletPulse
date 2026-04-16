import {useEffect} from 'react';
import {useAuthStore} from '@presentation/stores/useAuthStore';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (!store.isInitialized) {
      store.initialize();
    }
  }, [store.isInitialized]);

  return store;
}
