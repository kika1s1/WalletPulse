import {EntitlementRepository} from '@data/repositories/EntitlementRepository';
import {TIER_LIMITS} from '@domain/entities/tier-config';
import {ENTITLEMENT_IDS, PRODUCT_IDS} from '@shared/constants/purchase-constants';

const now = Date.now();
const thirtyDaysMs = 30 * 86_400_000;

function buildCustomerInfo(overrides: {
  activeEntitlements?: Record<string, {isActive: boolean; periodType: string; expirationDateMillis: number | null; originalPurchaseDateMillis: number}>;
  allPurchasedProductIdentifiers?: string[];
} = {}) {
  const activeEntitlements = overrides.activeEntitlements ?? {};
  return {
    entitlements: {
      active: activeEntitlements,
      all: activeEntitlements,
      verification: 'NOT_REQUESTED',
    },
    activeSubscriptions: Object.values(activeEntitlements)
      .filter(e => e.isActive)
      .map(() => 'some_sku'),
    allPurchasedProductIdentifiers: overrides.allPurchasedProductIdentifiers ?? [],
    latestExpirationDate: null,
    firstSeen: new Date().toISOString(),
    originalAppUserId: 'user-1',
    requestDate: new Date().toISOString(),
    allExpirationDates: {},
    allPurchaseDates: {},
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
  };
}

const mockGetCustomerInfo = jest.fn();

jest.mock('@infrastructure/purchases/revenue-cat-client', () => ({
  getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
}));

describe('EntitlementRepository', () => {
  let repo: EntitlementRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EntitlementRepository();
  });

  describe('getCurrentTier', () => {
    it('returns free when no active entitlements', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo());
      expect(await repo.getCurrentTier()).toBe('free');
    });

    it('returns pro when pro entitlement is active', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      expect(await repo.getCurrentTier()).toBe('pro');
    });

    it('returns business when business entitlement is active', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.BUSINESS]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      expect(await repo.getCurrentTier()).toBe('business');
    });

    it('returns lifetime when lifetime product is purchased', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: null,
            originalPurchaseDateMillis: now,
          },
        },
        allPurchasedProductIdentifiers: [PRODUCT_IDS.LIFETIME_PRO],
      }));
      expect(await repo.getCurrentTier()).toBe('lifetime');
    });

    it('prefers business over pro when both are active', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
          [ENTITLEMENT_IDS.BUSINESS]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      expect(await repo.getCurrentTier()).toBe('business');
    });

    it('returns free when getCustomerInfo returns null', async () => {
      mockGetCustomerInfo.mockResolvedValue(null);
      expect(await repo.getCurrentTier()).toBe('free');
    });
  });

  describe('getFeatureLimits', () => {
    it('returns free limits for free user', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo());
      const limits = await repo.getFeatureLimits();
      expect(limits).toEqual(TIER_LIMITS.free);
    });

    it('returns pro limits for pro user', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      const limits = await repo.getFeatureLimits();
      expect(limits).toEqual(TIER_LIMITS.pro);
    });

    it('returns business limits for business user', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.BUSINESS]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      const limits = await repo.getFeatureLimits();
      expect(limits).toEqual(TIER_LIMITS.business);
    });
  });

  describe('isFeatureAvailable', () => {
    it('returns false for export on free tier', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo());
      expect(await repo.isFeatureAvailable('export')).toBe(false);
    });

    it('returns true for export on pro tier', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      expect(await repo.isFeatureAvailable('export')).toBe(true);
    });
  });

  describe('getFeatureLimit', () => {
    it('returns 2 for maxWallets on free tier', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo());
      expect(await repo.getFeatureLimit('maxWallets')).toBe(2);
    });

    it('returns Infinity for maxWallets on pro tier', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: now + thirtyDaysMs,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      expect(await repo.getFeatureLimit('maxWallets')).toBe(Infinity);
    });
  });

  describe('getEntitlement', () => {
    it('builds free entitlement when no subscriptions', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo());
      const ent = await repo.getEntitlement();
      expect(ent.tier).toBe('free');
      expect(ent.isTrialing).toBe(false);
      expect(ent.trialEndsAt).toBeNull();
      expect(ent.expiresAt).toBeNull();
      expect(ent.purchasedAt).toBeNull();
    });

    it('detects active trial from periodType TRIAL', async () => {
      const trialEnds = now + 14 * 86_400_000;
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'TRIAL',
            expirationDateMillis: trialEnds,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      const ent = await repo.getEntitlement();
      expect(ent.tier).toBe('pro');
      expect(ent.isTrialing).toBe(true);
      expect(ent.trialEndsAt).toBe(trialEnds);
    });

    it('sets expiresAt and purchasedAt from entitlement info', async () => {
      const expiresAt = now + thirtyDaysMs;
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: expiresAt,
            originalPurchaseDateMillis: now,
          },
        },
      }));
      const ent = await repo.getEntitlement();
      expect(ent.expiresAt).toBe(expiresAt);
      expect(ent.purchasedAt).toBe(now);
    });

    it('sets null expiresAt for lifetime', async () => {
      mockGetCustomerInfo.mockResolvedValue(buildCustomerInfo({
        activeEntitlements: {
          [ENTITLEMENT_IDS.PRO]: {
            isActive: true,
            periodType: 'NORMAL',
            expirationDateMillis: null,
            originalPurchaseDateMillis: now,
          },
        },
        allPurchasedProductIdentifiers: [PRODUCT_IDS.LIFETIME_PRO],
      }));
      const ent = await repo.getEntitlement();
      expect(ent.tier).toBe('lifetime');
      expect(ent.expiresAt).toBeNull();
    });
  });
});
