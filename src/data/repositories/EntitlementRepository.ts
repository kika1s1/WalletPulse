import type {IEntitlementRepository} from '@domain/repositories/IEntitlementRepository';
import type {Tier, FeatureLimits, Entitlement} from '@domain/entities/Entitlement';
import {getTierLimits} from '@domain/entities/tier-config';
import {getCustomerInfo} from '@infrastructure/purchases/revenue-cat-client';
import {
  mapCustomerInfoToEntitlement,
  mapCustomerInfoToTier,
} from '@infrastructure/purchases/entitlement-map';

export class EntitlementRepository implements IEntitlementRepository {
  async getCurrentTier(): Promise<Tier> {
    return mapCustomerInfoToTier(await getCustomerInfo());
  }

  async getFeatureLimits(): Promise<FeatureLimits> {
    const tier = await this.getCurrentTier();
    return getTierLimits(tier);
  }

  async isFeatureAvailable(feature: keyof FeatureLimits): Promise<boolean> {
    const limits = await this.getFeatureLimits();
    const value = limits[feature];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value > 0;
    }
    return Boolean(value);
  }

  async getFeatureLimit(feature: keyof FeatureLimits): Promise<number | boolean | string> {
    const limits = await this.getFeatureLimits();
    return limits[feature];
  }

  async getEntitlement(): Promise<Entitlement> {
    return mapCustomerInfoToEntitlement(await getCustomerInfo());
  }
}
