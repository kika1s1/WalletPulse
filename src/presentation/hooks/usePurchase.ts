import {useCallback, useEffect, useState} from 'react';
import type {WalletPulsePlanId} from '@shared/constants/purchase-constants';
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';
import {monetizationAnalytics} from '@infrastructure/analytics/monetization-events';

type UsePurchaseReturn = {
  isLoading: boolean;
  isPurchasing: boolean;
  error: string | null;
  purchase: (planId: WalletPulsePlanId) => Promise<boolean>;
  restore: () => Promise<boolean>;
  clearError: () => void;
};

export function usePurchase(): UsePurchaseReturn {
  const isLoading = useEntitlementStore((s) => s.isLoading);
  const isBusy = useEntitlementStore((s) => s.isBusy);
  const storeError = useEntitlementStore((s) => s.error);
  const purchasePlan = useEntitlementStore((s) => s.purchasePlan);
  const restorePurchases = useEntitlementStore((s) => s.restorePurchases);
  const clearStoreError = useEntitlementStore((s) => s.clearError);
  const refresh = useEntitlementStore((s) => s.refresh);

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tier = useEntitlementStore((s) => s.entitlement.tier);

  const purchase = useCallback(
    async (planId: WalletPulsePlanId): Promise<boolean> => {
      setLocalError(null);
      const result = await purchasePlan(planId);
      if (!result.success) {
        setLocalError(result.errorMessage ?? 'Purchase failed.');
        void monetizationAnalytics.trackPurchaseFailed(planId, result.errorMessage ?? 'unknown');
        return false;
      }
      void monetizationAnalytics.trackPurchaseCompleted(planId, 0, tier);
      return true;
    },
    [purchasePlan, tier],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setLocalError(null);
    const result = await restorePurchases();
    if (!result.success) {
      setLocalError(result.errorMessage ?? 'Restore failed.');
      return false;
    }
    return true;
  }, [restorePurchases]);

  const clearError = useCallback(() => {
    setLocalError(null);
    clearStoreError();
  }, [clearStoreError]);

  return {
    isLoading,
    isPurchasing: isBusy,
    error: localError ?? storeError,
    purchase,
    restore,
    clearError,
  };
}
