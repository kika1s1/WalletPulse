import {useState, useEffect, useCallback} from 'react';
import type {Wallet} from '@domain/entities/Wallet';
import {getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {makeUpdateWallet} from '@domain/usecases/update-wallet';
import type {UpdateWalletFields} from '@domain/usecases/update-wallet';

export type UseWalletsReturn = {
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateWallet: (id: string, fields: UpdateWalletFields) => Promise<Wallet>;
  deleteWallet: (id: string) => Promise<void>;
};

export function useWallets(): UseWalletsReturn {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const updateWallet = useCallback(async (id: string, fields: UpdateWalletFields) => {
    const ds = getSupabaseDataSource();
    const execute = makeUpdateWallet({walletRepo: ds.wallets});
    const result = await execute(id, fields);
    refetch();
    return result;
  }, [refetch]);

  const deleteWallet = useCallback(async (id: string) => {
    const ds = getSupabaseDataSource();
    await ds.wallets.delete(id);
    refetch();
  }, [refetch]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getSupabaseDataSource();
        const data = await ds.wallets.findAll();
        if (!cancelled) {
          setWallets(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [refetchKey]);

  return {wallets, isLoading, error, refetch, updateWallet, deleteWallet};
}
