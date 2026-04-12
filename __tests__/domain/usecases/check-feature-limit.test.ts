import {makeCheckFeatureLimit} from '@domain/usecases/check-feature-limit';
import type {IEntitlementRepository} from '@domain/repositories/IEntitlementRepository';
import type {FeatureLimits} from '@domain/entities/Entitlement';
import {TIER_LIMITS} from '@domain/entities/tier-config';

function buildRepo(tier: 'free' | 'pro' | 'business'): IEntitlementRepository {
  const limits = TIER_LIMITS[tier];
  return {
    getCurrentTier: jest.fn().mockResolvedValue(tier),
    getFeatureLimits: jest.fn().mockResolvedValue(limits),
    getEntitlement: jest.fn().mockResolvedValue({
      id: `ent-${tier}`,
      tier,
      featureLimits: limits,
      isTrialing: false,
      trialEndsAt: null,
      expiresAt: null,
      purchasedAt: null,
    }),
    isFeatureAvailable: jest.fn().mockImplementation(async (f: keyof FeatureLimits) => {
      const val = limits[f];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return Boolean(val);
    }),
    getFeatureLimit: jest.fn().mockImplementation(async (f: keyof FeatureLimits) => limits[f]),
  };
}

describe('CheckFeatureLimit use case', () => {
  describe('maxWallets', () => {
    it('free user with 0 wallets can add (max 2)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(0),
        limitKey: 'maxWallets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.maxCount).toBe(2);
      expect(result.tier).toBe('free');
    });

    it('free user with 1 wallet can add (max 2)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(1),
        limitKey: 'maxWallets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.maxCount).toBe(2);
    });

    it('free user with 2 wallets cannot add (max 2)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(2),
        limitKey: 'maxWallets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(2);
      expect(result.maxCount).toBe(2);
    });

    it('pro user with 100 wallets can add (unlimited)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('pro'),
        countProvider: jest.fn().mockResolvedValue(100),
        limitKey: 'maxWallets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(100);
      expect(result.maxCount).toBe(Infinity);
      expect(result.tier).toBe('pro');
    });

    it('business user with 50 wallets can add (unlimited)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('business'),
        countProvider: jest.fn().mockResolvedValue(50),
        limitKey: 'maxWallets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.maxCount).toBe(Infinity);
    });
  });

  describe('maxBudgets', () => {
    it('free user with 0 budgets can add (max 1)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(0),
        limitKey: 'maxBudgets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.maxCount).toBe(1);
    });

    it('free user with 1 budget cannot add (max 1)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(1),
        limitKey: 'maxBudgets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(1);
      expect(result.maxCount).toBe(1);
    });

    it('pro user with 20 budgets can add', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('pro'),
        countProvider: jest.fn().mockResolvedValue(20),
        limitKey: 'maxBudgets',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
    });
  });

  describe('maxParserApps', () => {
    it('free user with 0 parsers can add (max 1)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(0),
        limitKey: 'maxParserApps',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(true);
      expect(result.maxCount).toBe(1);
    });

    it('free user with 1 parser cannot add (max 1)', async () => {
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider: jest.fn().mockResolvedValue(1),
        limitKey: 'maxParserApps',
      });
      const result = await check.canAdd();
      expect(result.allowed).toBe(false);
    });
  });

  describe('countProvider is called exactly once', () => {
    it('calls countProvider on canAdd', async () => {
      const countProvider = jest.fn().mockResolvedValue(1);
      const check = makeCheckFeatureLimit({
        entitlementRepo: buildRepo('free'),
        countProvider,
        limitKey: 'maxWallets',
      });
      await check.canAdd();
      expect(countProvider).toHaveBeenCalledTimes(1);
    });
  });
});
