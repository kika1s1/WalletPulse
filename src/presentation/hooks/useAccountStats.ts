import {useState, useEffect, useCallback} from 'react';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';

export type AccountStats = {
  totalTransactions: number;
  totalWallets: number;
  totalCategories: number;
  totalBudgets: number;
  totalGoals: number;
};

export function useAccountStats() {
  const [stats, setStats] = useState<AccountStats>({
    totalTransactions: 0,
    totalWallets: 0,
    totalCategories: 0,
    totalBudgets: 0,
    totalGoals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const ds = getLocalDataSource();
      const [transactions, wallets, categories, budgets, goals] = await Promise.all([
        ds.transactions.findAll(),
        ds.wallets.findAll(),
        ds.categories.findAll(),
        ds.budgets.findAll(),
        ds.goals.findAll(),
      ]);
      setStats({
        totalTransactions: transactions.length,
        totalWallets: wallets.length,
        totalCategories: categories.length,
        totalBudgets: budgets.length,
        totalGoals: goals.length,
      });
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {stats, isLoading, refetch: fetch};
}
