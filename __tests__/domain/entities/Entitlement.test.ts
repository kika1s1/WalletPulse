import {
  type Tier,
  type FeatureLimits,
  type Entitlement,
  createEntitlement,
  isTrialActive,
  isExpired,
  VALID_TIERS,
} from '@domain/entities/Entitlement';

const now = Date.now();

const proLimits: FeatureLimits = {
  maxWallets: Infinity,
  maxBudgets: Infinity,
  maxParserApps: Infinity,
  historyMonths: Infinity,
  customCategories: true,
  export: true,
  darkMode: true,
  biometricLock: true,
  encryption: true,
  goals: true,
  subscriptionTracking: true,
  billReminders: true,
  templates: true,
  receipts: true,
  tags: true,
  savedFilters: true,
  backup: 'local',
  insights: 'full',
  financialHealthScore: true,
  paydayPlanner: true,
  spendingAutopsy: true,
  multiProfile: false,
  taxCategories: false,
  taxEstimate: false,
  invoiceTracking: false,
  profitLoss: false,
  clientExpenses: false,
  professionalReports: false,
  googleDriveBackup: false,
  scheduledExports: false,
  currencyGainLoss: false,
  spendingPredictions: false,
  customParsers: false,
  homeWidgets: false,
  splitExpenses: false,
  moneyLostTracker: false,
  currencyTimingAdvisor: false,
  freelancerDashboard: false,
  billNegotiationAlerts: false,
};

const baseInput = {
  id: 'ent-1',
  tier: 'pro' as Tier,
  featureLimits: proLimits,
  isTrialing: false,
  trialEndsAt: null,
  expiresAt: now + 30 * 86_400_000,
  purchasedAt: now,
};

describe('Entitlement entity', () => {
  describe('VALID_TIERS', () => {
    it('contains all four tiers', () => {
      expect(VALID_TIERS).toEqual(['free', 'pro', 'business', 'lifetime']);
    });
  });

  describe('createEntitlement', () => {
    it('creates a pro entitlement with all fields', () => {
      const e = createEntitlement(baseInput);
      expect(e.id).toBe('ent-1');
      expect(e.tier).toBe('pro');
      expect(e.featureLimits.maxWallets).toBe(Infinity);
      expect(e.featureLimits.export).toBe(true);
      expect(e.isTrialing).toBe(false);
      expect(e.trialEndsAt).toBeNull();
      expect(e.expiresAt).toBe(baseInput.expiresAt);
      expect(e.purchasedAt).toBe(now);
    });

    it('creates a free entitlement', () => {
      const freeLimits: FeatureLimits = {
        ...proLimits,
        maxWallets: 2,
        maxBudgets: 1,
        maxParserApps: 1,
        historyMonths: 6,
        customCategories: false,
        export: false,
        darkMode: false,
        biometricLock: false,
        encryption: false,
        goals: false,
        subscriptionTracking: false,
        billReminders: false,
        templates: false,
        receipts: false,
        tags: false,
        savedFilters: false,
        backup: false,
        insights: 'basic',
        financialHealthScore: false,
        paydayPlanner: false,
        spendingAutopsy: false,
      };

      const e = createEntitlement({
        ...baseInput,
        id: 'ent-free',
        tier: 'free',
        featureLimits: freeLimits,
        expiresAt: null,
        purchasedAt: null,
      });

      expect(e.tier).toBe('free');
      expect(e.featureLimits.maxWallets).toBe(2);
      expect(e.featureLimits.export).toBe(false);
      expect(e.expiresAt).toBeNull();
      expect(e.purchasedAt).toBeNull();
    });

    it('creates a trialing entitlement', () => {
      const trialEndsAt = now + 14 * 86_400_000;
      const e = createEntitlement({
        ...baseInput,
        isTrialing: true,
        trialEndsAt,
      });

      expect(e.isTrialing).toBe(true);
      expect(e.trialEndsAt).toBe(trialEndsAt);
    });

    it('rejects an invalid tier', () => {
      expect(() =>
        createEntitlement({...baseInput, tier: 'premium' as Tier}),
      ).toThrow('Invalid tier');
    });

    it('rejects empty id', () => {
      expect(() => createEntitlement({...baseInput, id: ''})).toThrow(
        'Entitlement id is required',
      );
    });

    it('rejects trialing without trialEndsAt', () => {
      expect(() =>
        createEntitlement({...baseInput, isTrialing: true, trialEndsAt: null}),
      ).toThrow('Trial end date is required when trialing');
    });
  });

  describe('isTrialActive', () => {
    it('returns true for active trial', () => {
      const e = createEntitlement({
        ...baseInput,
        isTrialing: true,
        trialEndsAt: now + 86_400_000,
      });
      expect(isTrialActive(e, now)).toBe(true);
    });

    it('returns false when trial has ended', () => {
      const e = createEntitlement({
        ...baseInput,
        isTrialing: true,
        trialEndsAt: now - 1,
      });
      expect(isTrialActive(e, now)).toBe(false);
    });

    it('returns false when not trialing', () => {
      const e = createEntitlement(baseInput);
      expect(isTrialActive(e, now)).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns false when expiresAt is in the future', () => {
      const e = createEntitlement(baseInput);
      expect(isExpired(e, now)).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
      const e = createEntitlement({
        ...baseInput,
        expiresAt: now - 1,
      });
      expect(isExpired(e, now)).toBe(true);
    });

    it('returns false when expiresAt is null (free tier, never expires)', () => {
      const e = createEntitlement({
        ...baseInput,
        tier: 'free',
        expiresAt: null,
        purchasedAt: null,
      });
      expect(isExpired(e, now)).toBe(false);
    });

    it('returns false for lifetime tier regardless of expiresAt', () => {
      const e = createEntitlement({
        ...baseInput,
        tier: 'lifetime',
        expiresAt: now - 86_400_000,
      });
      expect(isExpired(e, now)).toBe(false);
    });
  });

  describe('FeatureLimits type completeness', () => {
    it('has all expected numeric limit keys', () => {
      const limits = baseInput.featureLimits;
      expect(typeof limits.maxWallets).toBe('number');
      expect(typeof limits.maxBudgets).toBe('number');
      expect(typeof limits.maxParserApps).toBe('number');
      expect(typeof limits.historyMonths).toBe('number');
    });

    it('has all expected boolean feature keys', () => {
      const limits = baseInput.featureLimits;
      const booleanKeys: (keyof FeatureLimits)[] = [
        'customCategories',
        'export',
        'darkMode',
        'biometricLock',
        'encryption',
        'goals',
        'subscriptionTracking',
        'billReminders',
        'templates',
        'receipts',
        'tags',
        'savedFilters',
        'financialHealthScore',
        'paydayPlanner',
        'spendingAutopsy',
        'multiProfile',
        'taxCategories',
        'taxEstimate',
        'invoiceTracking',
        'profitLoss',
        'clientExpenses',
        'professionalReports',
        'googleDriveBackup',
        'scheduledExports',
        'currencyGainLoss',
        'spendingPredictions',
        'customParsers',
        'homeWidgets',
        'splitExpenses',
        'moneyLostTracker',
        'currencyTimingAdvisor',
        'freelancerDashboard',
        'billNegotiationAlerts',
      ];

      for (const key of booleanKeys) {
        expect(typeof limits[key]).toBe('boolean');
      }
    });

    it('has backup and insights as string-or-boolean fields', () => {
      const limits = baseInput.featureLimits;
      expect(['string', 'boolean']).toContain(typeof limits.backup);
      expect(['string', 'boolean']).toContain(typeof limits.insights);
    });
  });
});
