import {useCallback, useEffect, useRef} from 'react';
import type {FeatureLimits, Tier} from '@domain/entities/Entitlement';
import {useEntitlement} from './useEntitlement';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';
import {monetizationAnalytics} from '@infrastructure/analytics/monetization-events';

type FeatureGateResult = {
  available: boolean;
  tier: Tier;
  showPaywall: () => void;
};

export function useFeatureGate(
  feature: keyof FeatureLimits,
): FeatureGateResult {
  const {tier, canAccess} = useEntitlement();

  const available = canAccess(feature);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!available && !trackedRef.current) {
      trackedRef.current = true;
      void monetizationAnalytics.trackFeatureGateHit(String(feature), tier);
    }
  }, [available, feature, tier]);

  const showPaywall = useCallback(() => {
    navigateToPaywall('feature_gate', String(feature));
  }, [feature]);

  return {available, tier, showPaywall};
}
