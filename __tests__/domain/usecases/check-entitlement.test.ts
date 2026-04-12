import {makeCheckEntitlement} from '@domain/usecases/check-entitlement';
import type {IEntitlementRepository} from '@domain/repositories/IEntitlementRepository';
import type {Entitlement, FeatureLimits} from '@domain/entities/Entitlement';
import {TIER_LIMITS} from '@domain/entities/tier-config';

const now = Date.now();
const fourteenDays = 14 * 86_400_000;

function buildMockRepo(overrides: Partial<IEntitlementRepository> = {}): IEntitlementRepository {
  const defaults: IEntitlementRepository = {
    getCurrentTier: jest.fn().mockResolvedValue('free'),
    getFeatureLimits: jest.fn().mockResolvedValue(TIER_LIMITS.free),
    getEntitlement: jest.fn().mockResolvedValue({
      id: 'ent-1',
      tier: 'free',
      featureLimits: TIER_LIMITS.free,
      isTrialing: false,
      trialEndsAt: null,
      expiresAt: null,
      purchasedAt: null,
    } satisfies Entitlement),
    isFeatureAvailable: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      const val = TIER_LIMITS.free[feature];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return Boolean(val);
    }),
    getFeatureLimit: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      return TIER_LIMITS.free[feature];
    }),
  };
  return {...defaults, ...overrides};
}

function buildProRepo(): IEntitlementRepository {
  return buildMockRepo({
    getCurrentTier: jest.fn().mockResolvedValue('pro'),
    getFeatureLimits: jest.fn().mockResolvedValue(TIER_LIMITS.pro),
    getEntitlement: jest.fn().mockResolvedValue({
      id: 'ent-pro',
      tier: 'pro',
      featureLimits: TIER_LIMITS.pro,
      isTrialing: false,
      trialEndsAt: null,
      expiresAt: now + 30 * 86_400_000,
      purchasedAt: now,
    } satisfies Entitlement),
    isFeatureAvailable: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      const val = TIER_LIMITS.pro[feature];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return Boolean(val);
    }),
    getFeatureLimit: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      return TIER_LIMITS.pro[feature];
    }),
  });
}

function buildBusinessRepo(): IEntitlementRepository {
  return buildMockRepo({
    getCurrentTier: jest.fn().mockResolvedValue('business'),
    getFeatureLimits: jest.fn().mockResolvedValue(TIER_LIMITS.business),
    getEntitlement: jest.fn().mockResolvedValue({
      id: 'ent-biz',
      tier: 'business',
      featureLimits: TIER_LIMITS.business,
      isTrialing: false,
      trialEndsAt: null,
      expiresAt: now + 30 * 86_400_000,
      purchasedAt: now,
    } satisfies Entitlement),
    isFeatureAvailable: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      const val = TIER_LIMITS.business[feature];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return Boolean(val);
    }),
    getFeatureLimit: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      return TIER_LIMITS.business[feature];
    }),
  });
}

function buildTrialRepo(daysRemaining: number): IEntitlementRepository {
  const trialEndsAt = now + daysRemaining * 86_400_000;
  return buildMockRepo({
    getCurrentTier: jest.fn().mockResolvedValue('pro'),
    getFeatureLimits: jest.fn().mockResolvedValue(TIER_LIMITS.pro),
    getEntitlement: jest.fn().mockResolvedValue({
      id: 'ent-trial',
      tier: 'pro',
      featureLimits: TIER_LIMITS.pro,
      isTrialing: true,
      trialEndsAt,
      expiresAt: trialEndsAt,
      purchasedAt: null,
    } satisfies Entitlement),
    isFeatureAvailable: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      const val = TIER_LIMITS.pro[feature];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
      return Boolean(val);
    }),
    getFeatureLimit: jest.fn().mockImplementation(async (feature: keyof FeatureLimits) => {
      return TIER_LIMITS.pro[feature];
    }),
  });
}

describe('CheckEntitlement use case', () => {
  describe('canAccess', () => {
    it('free user cannot access export', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.canAccess('export')).toBe(false);
    });

    it('free user cannot access goals', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.canAccess('goals')).toBe(false);
    });

    it('free user cannot access darkMode', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.canAccess('darkMode')).toBe(false);
    });

    it('pro user can access export', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.canAccess('export')).toBe(true);
    });

    it('pro user can access goals', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.canAccess('goals')).toBe(true);
    });

    it('pro user cannot access multiProfile (business only)', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.canAccess('multiProfile')).toBe(false);
    });

    it('business user can access multiProfile', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildBusinessRepo()});
      expect(await check.canAccess('multiProfile')).toBe(true);
    });

    it('business user can access all pro features too', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildBusinessRepo()});
      expect(await check.canAccess('export')).toBe(true);
      expect(await check.canAccess('goals')).toBe(true);
      expect(await check.canAccess('financialHealthScore')).toBe(true);
    });

    it('treats string truthy values (backup, insights) as accessible', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.canAccess('backup')).toBe(true);
      expect(await check.canAccess('insights')).toBe(true);
    });

    it('treats false backup as not accessible on free', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.canAccess('backup')).toBe(false);
    });
  });

  describe('getLimit', () => {
    it('free user maxWallets returns 2', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.getLimit('maxWallets')).toBe(2);
    });

    it('free user maxBudgets returns 1', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.getLimit('maxBudgets')).toBe(1);
    });

    it('free user historyMonths returns 6', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.getLimit('historyMonths')).toBe(6);
    });

    it('pro user maxWallets returns Infinity', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.getLimit('maxWallets')).toBe(Infinity);
    });

    it('pro user backup returns "local"', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.getLimit('backup')).toBe('local');
    });

    it('business user backup returns "cloud"', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildBusinessRepo()});
      expect(await check.getLimit('backup')).toBe('cloud');
    });
  });

  describe('getCurrentTier', () => {
    it('returns free for free user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.getCurrentTier()).toBe('free');
    });

    it('returns pro for pro user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});
      expect(await check.getCurrentTier()).toBe('pro');
    });

    it('returns business for business user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildBusinessRepo()});
      expect(await check.getCurrentTier()).toBe('business');
    });
  });

  describe('isTrialing', () => {
    it('returns false for non-trial user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.isTrialing()).toBe(false);
    });

    it('returns true for trial user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildTrialRepo(10)});
      expect(await check.isTrialing()).toBe(true);
    });
  });

  describe('getTrialDaysRemaining', () => {
    it('returns null for non-trial user', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});
      expect(await check.getTrialDaysRemaining()).toBeNull();
    });

    it('returns correct days for active trial', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildTrialRepo(10)});
      const days = await check.getTrialDaysRemaining();
      expect(days).toBe(10);
    });

    it('returns 1 for trial ending within the next day (partial day rounds up)', async () => {
      const trialEndsAt = now + 12 * 3_600_000; // 12 hours from now
      const repo = buildMockRepo({
        getEntitlement: jest.fn().mockResolvedValue({
          id: 'ent-almost',
          tier: 'pro',
          featureLimits: TIER_LIMITS.pro,
          isTrialing: true,
          trialEndsAt,
          expiresAt: trialEndsAt,
          purchasedAt: null,
        } satisfies Entitlement),
      });
      const check = makeCheckEntitlement({entitlementRepo: repo});
      const days = await check.getTrialDaysRemaining();
      expect(days).toBe(1);
    });

    it('returns 0 for expired trial', async () => {
      const trialEndsAt = now - 86_400_000;
      const repo = buildMockRepo({
        getEntitlement: jest.fn().mockResolvedValue({
          id: 'ent-expired',
          tier: 'pro',
          featureLimits: TIER_LIMITS.pro,
          isTrialing: true,
          trialEndsAt,
          expiresAt: trialEndsAt,
          purchasedAt: null,
        } satisfies Entitlement),
      });
      const check = makeCheckEntitlement({entitlementRepo: repo});
      const days = await check.getTrialDaysRemaining();
      expect(days).toBe(0);
    });
  });

  describe('integration with tier-config', () => {
    it('free limits from tier-config match canAccess behavior', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildMockRepo()});

      const proOnlyFeatures: (keyof FeatureLimits)[] = [
        'customCategories', 'export', 'darkMode', 'biometricLock',
        'encryption', 'goals', 'subscriptionTracking', 'billReminders',
        'templates', 'receipts', 'tags', 'savedFilters',
        'financialHealthScore', 'paydayPlanner', 'spendingAutopsy',
      ];

      for (const feature of proOnlyFeatures) {
        expect(await check.canAccess(feature)).toBe(false);
      }
    });

    it('pro limits from tier-config match canAccess behavior', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildProRepo()});

      const proFeatures: (keyof FeatureLimits)[] = [
        'customCategories', 'export', 'darkMode', 'biometricLock',
        'encryption', 'goals', 'subscriptionTracking', 'billReminders',
        'templates', 'receipts', 'tags', 'savedFilters',
        'financialHealthScore', 'paydayPlanner', 'spendingAutopsy',
      ];

      for (const feature of proFeatures) {
        expect(await check.canAccess(feature)).toBe(true);
      }
    });

    it('business limits from tier-config unlock everything', async () => {
      const check = makeCheckEntitlement({entitlementRepo: buildBusinessRepo()});

      const businessFeatures: (keyof FeatureLimits)[] = [
        'multiProfile', 'taxCategories', 'taxEstimate', 'invoiceTracking',
        'profitLoss', 'clientExpenses', 'professionalReports',
        'googleDriveBackup', 'scheduledExports', 'currencyGainLoss',
        'spendingPredictions', 'customParsers', 'homeWidgets',
        'splitExpenses', 'moneyLostTracker', 'currencyTimingAdvisor',
        'freelancerDashboard', 'billNegotiationAlerts',
      ];

      for (const feature of businessFeatures) {
        expect(await check.canAccess(feature)).toBe(true);
      }
    });
  });
});
