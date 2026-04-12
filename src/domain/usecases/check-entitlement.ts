import type {IEntitlementRepository} from '@domain/repositories/IEntitlementRepository';
import type {Tier, FeatureLimits} from '@domain/entities/Entitlement';

type Deps = {
  entitlementRepo: IEntitlementRepository;
};

const MS_PER_DAY = 86_400_000;

export function makeCheckEntitlement({entitlementRepo}: Deps) {
  async function canAccess(feature: keyof FeatureLimits): Promise<boolean> {
    return entitlementRepo.isFeatureAvailable(feature);
  }

  async function getLimit(feature: keyof FeatureLimits): Promise<number | boolean | string> {
    return entitlementRepo.getFeatureLimit(feature);
  }

  async function getCurrentTier(): Promise<Tier> {
    return entitlementRepo.getCurrentTier();
  }

  async function isTrialing(): Promise<boolean> {
    const entitlement = await entitlementRepo.getEntitlement();
    return entitlement.isTrialing;
  }

  async function getTrialDaysRemaining(): Promise<number | null> {
    const entitlement = await entitlementRepo.getEntitlement();
    if (!entitlement.isTrialing || entitlement.trialEndsAt === null) {
      return null;
    }
    const remaining = entitlement.trialEndsAt - Date.now();
    if (remaining <= 0) {
      return 0;
    }
    return Math.ceil(remaining / MS_PER_DAY);
  }

  return {canAccess, getLimit, getCurrentTier, isTrialing, getTrialDaysRemaining};
}
