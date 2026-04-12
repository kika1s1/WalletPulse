import type {IEntitlementRepository} from '@domain/repositories/IEntitlementRepository';
import type {Tier, FeatureLimits} from '@domain/entities/Entitlement';

type NumericLimitKey = 'maxWallets' | 'maxBudgets' | 'maxParserApps' | 'historyMonths';

type Deps = {
  entitlementRepo: IEntitlementRepository;
  countProvider: () => Promise<number>;
  limitKey: NumericLimitKey;
};

export type FeatureLimitResult = {
  allowed: boolean;
  currentCount: number;
  maxCount: number;
  tier: Tier;
};

export function makeCheckFeatureLimit({entitlementRepo, countProvider, limitKey}: Deps) {
  async function canAdd(): Promise<FeatureLimitResult> {
    const [tier, currentCount, limitValue] = await Promise.all([
      entitlementRepo.getCurrentTier(),
      countProvider(),
      entitlementRepo.getFeatureLimit(limitKey),
    ]);

    const maxCount = typeof limitValue === 'number' ? limitValue : 0;

    return {
      allowed: currentCount < maxCount,
      currentCount,
      maxCount,
      tier,
    };
  }

  return {canAdd};
}
