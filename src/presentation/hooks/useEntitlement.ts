import {useCallback, useMemo} from 'react';
import type {FeatureLimits} from '@domain/entities/Entitlement';
import {useEntitlementStore} from '@presentation/stores/useEntitlementStore';

export function useEntitlement() {
  const initialized = useEntitlementStore((state) => state.initialized);
  const isLoading = useEntitlementStore((state) => state.isLoading);
  const isBusy = useEntitlementStore((state) => state.isBusy);
  const error = useEntitlementStore((state) => state.error);
  const appUserId = useEntitlementStore((state) => state.appUserId);
  const customerInfo = useEntitlementStore((state) => state.customerInfo);
  const entitlement = useEntitlementStore((state) => state.entitlement);
  const currentPlanId = useEntitlementStore((state) => state.currentPlanId);
  const currentPlanLabel = useEntitlementStore((state) => state.currentPlanLabel);
  const managementUrl = useEntitlementStore((state) => state.managementUrl);
  const offering = useEntitlementStore((state) => state.offering);
  const availablePackages = useEntitlementStore((state) => state.availablePackages);

  const canAccess = useCallback(
    (feature: keyof FeatureLimits): boolean => {
      const value = entitlement.featureLimits[feature];

      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        return value > 0;
      }

      return Boolean(value);
    },
    [entitlement.featureLimits],
  );

  const summary = useMemo(
    () => ({
      initialized,
      isLoading,
      isBusy,
      error,
      appUserId,
      customerInfo,
      entitlement,
      tier: entitlement.tier,
      isFree: entitlement.tier === 'free',
      isPro:
        entitlement.tier === 'pro' ||
        entitlement.tier === 'lifetime' ||
        entitlement.tier === 'business',
      isLifetime: entitlement.tier === 'lifetime',
      hasWalletPulsePro: entitlement.tier !== 'free',
      currentPlanId,
      currentPlanLabel,
      managementUrl,
      offering,
      availablePackages,
      canAccess,
      expiresAt: entitlement.expiresAt,
      trialEndsAt: entitlement.trialEndsAt,
      isTrialing: entitlement.isTrialing,
    }),
    [
      appUserId,
      availablePackages,
      canAccess,
      currentPlanId,
      currentPlanLabel,
      customerInfo,
      entitlement,
      error,
      initialized,
      isBusy,
      isLoading,
      managementUrl,
      offering,
    ],
  );

  return summary;
}
