import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import WalletModel from '@data/database/models/WalletModel';
import {Q} from '@nozbe/watermelondb';
import {toDomain} from '@data/mappers/wallet-mapper';
import type {Wallet} from '@domain/entities/Wallet';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
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

function walletModelToDomain(model: WalletModel): Wallet {
  return toDomain({
    id: model.id,
    currency: model.currency,
    name: model.name,
    balance: model.balance,
    isActive: model.isActive,
    icon: model.icon,
    color: model.color,
    sortOrder: model.sortOrder,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  });
}

export function useWallets(): UseWalletsReturn {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const updateWallet = useCallback(async (id: string, fields: UpdateWalletFields) => {
    const ds = getLocalDataSource();
    const execute = makeUpdateWallet({walletRepo: ds.wallets});
    return execute(id, fields);
  }, []);

  const deleteWallet = useCallback(async (id: string) => {
    const ds = getLocalDataSource();
    await ds.wallets.delete(id);
  }, []);

  useEffect(() => {
    const collection = database.get<WalletModel>('wallets');
    const query = collection.query(Q.sortBy('sort_order', Q.asc));

    if (!hasData.current) setIsLoading(true);
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setWallets(models.map(walletModelToDomain));
        setIsLoading(false);
        setError(null);
      },
      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refetchKey]);

  return {wallets, isLoading, error, refetch, updateWallet, deleteWallet};
}
