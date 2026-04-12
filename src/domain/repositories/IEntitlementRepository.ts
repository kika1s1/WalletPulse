import type {Tier, FeatureLimits, Entitlement} from '@domain/entities/Entitlement';

export interface IEntitlementRepository {
  getCurrentTier(): Promise<Tier>;
  getFeatureLimits(): Promise<FeatureLimits>;
  getEntitlement(): Promise<Entitlement>;
  isFeatureAvailable(feature: keyof FeatureLimits): Promise<boolean>;
  getFeatureLimit(feature: keyof FeatureLimits): Promise<number | boolean | string>;
}
