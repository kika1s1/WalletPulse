import {
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
  PRODUCT_TYPE,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import {TIER_LIMITS} from '@domain/entities/tier-config';
import {
  findPackageForPlan,
  getActivePlanId,
  hasWalletPulseProEntitlement,
  mapCustomerInfoToEntitlement,
  mapCustomerInfoToTier,
} from '@infrastructure/purchases/entitlement-map';
import {ENTITLEMENT_IDS, PRODUCT_IDS} from '@shared/constants/purchase-constants';

const now = Date.now();
const NOT_REQUESTED = 'NOT_REQUESTED' as CustomerInfo['entitlements']['verification'];

function buildCustomerInfo(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
  return {
    entitlements: {
      active: {},
      all: {},
      verification: NOT_REQUESTED,
    },
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: null,
    firstSeen: new Date(now).toISOString(),
    originalAppUserId: '$RCAnonymousID:test-user',
    requestDate: new Date(now).toISOString(),
    allExpirationDates: {},
    allPurchaseDates: {},
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
    ...overrides,
  };
}

function buildPayingCustomerInfo(productIdentifier: string): CustomerInfo {
  const entitlement = {
    identifier: ENTITLEMENT_IDS.WALLETPULSE_PRO,
    isActive: true,
    willRenew: productIdentifier !== PRODUCT_IDS.LIFETIME,
    periodType: 'NORMAL',
    latestPurchaseDate: new Date(now).toISOString(),
    latestPurchaseDateMillis: now,
    originalPurchaseDate: new Date(now).toISOString(),
    originalPurchaseDateMillis: now,
    expirationDate: productIdentifier === PRODUCT_IDS.LIFETIME ? null : new Date(now + 30 * 86_400_000).toISOString(),
    expirationDateMillis: productIdentifier === PRODUCT_IDS.LIFETIME ? null : now + 30 * 86_400_000,
    store: 'PLAY_STORE',
    productIdentifier,
    productPlanIdentifier: null,
    isSandbox: true,
    unsubscribeDetectedAt: null,
    unsubscribeDetectedAtMillis: null,
    billingIssueDetectedAt: null,
    billingIssueDetectedAtMillis: null,
    ownershipType: 'PURCHASED',
    verification: NOT_REQUESTED,
  } as const;

  return buildCustomerInfo({
    entitlements: {
      active: {
        [ENTITLEMENT_IDS.WALLETPULSE_PRO]: entitlement,
      },
      all: {
        [ENTITLEMENT_IDS.WALLETPULSE_PRO]: entitlement,
      },
      verification: NOT_REQUESTED,
    },
    activeSubscriptions: productIdentifier === PRODUCT_IDS.LIFETIME ? [] : [productIdentifier],
    allPurchasedProductIdentifiers: [productIdentifier],
  });
}

function buildPackage(
  identifier: string,
  packageType: PurchasesPackage['packageType'],
  productIdentifier: string,
): PurchasesPackage {
  return {
    identifier,
    packageType,
    product: {
      identifier: productIdentifier,
      description: `${identifier} description`,
      title: identifier,
      price: 4.99,
      priceString: '$4.99',
      pricePerWeek: null,
      pricePerMonth: null,
      pricePerYear: null,
      pricePerWeekString: null,
      pricePerMonthString: null,
      pricePerYearString: null,
      currencyCode: 'USD',
      introPrice: null,
      discounts: null,
      productCategory: PRODUCT_CATEGORY.SUBSCRIPTION,
      productType: PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION,
      subscriptionPeriod: null,
      defaultOption: null,
      subscriptionOptions: null,
      presentedOfferingIdentifier: 'default',
      presentedOfferingContext: {
        offeringIdentifier: 'default',
        placementIdentifier: null,
        targetingContext: null,
      },
    },
    offeringIdentifier: 'default',
    presentedOfferingContext: {
      offeringIdentifier: 'default',
      placementIdentifier: null,
      targetingContext: null,
    },
    webCheckoutUrl: null,
  };
}

function buildOffering(): PurchasesOffering {
  const monthly = buildPackage(
    '$rc_monthly',
    PACKAGE_TYPE.MONTHLY,
    PRODUCT_IDS.MONTHLY,
  );
  const yearly = buildPackage(
    '$rc_annual',
    PACKAGE_TYPE.ANNUAL,
    PRODUCT_IDS.YEARLY,
  );
  const lifetime = buildPackage(
    '$rc_lifetime',
    PACKAGE_TYPE.LIFETIME,
    PRODUCT_IDS.LIFETIME,
  );

  return {
    identifier: 'default',
    serverDescription: 'Default offering',
    metadata: {},
    availablePackages: [monthly, yearly, lifetime],
    monthly,
    annual: yearly,
    lifetime,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    weekly: null,
    webCheckoutUrl: null,
  };
}

describe('entitlement-map', () => {
  it('returns free when Walletpulse Pro is not active', () => {
    expect(hasWalletPulseProEntitlement(buildCustomerInfo())).toBe(false);
    expect(mapCustomerInfoToTier(buildCustomerInfo())).toBe('free');
  });

  it('maps monthly and yearly products to the pro tier', () => {
    expect(mapCustomerInfoToTier(buildPayingCustomerInfo(PRODUCT_IDS.MONTHLY))).toBe('pro');
    expect(mapCustomerInfoToTier(buildPayingCustomerInfo(PRODUCT_IDS.YEARLY))).toBe('pro');
  });

  it('maps the lifetime product to the lifetime tier', () => {
    expect(mapCustomerInfoToTier(buildPayingCustomerInfo(PRODUCT_IDS.LIFETIME))).toBe('lifetime');
  });

  it('extracts the active plan identifier from customer info', () => {
    expect(getActivePlanId(buildPayingCustomerInfo(PRODUCT_IDS.MONTHLY))).toBe('monthly');
    expect(getActivePlanId(buildPayingCustomerInfo(PRODUCT_IDS.YEARLY))).toBe('yearly');
    expect(getActivePlanId(buildPayingCustomerInfo(PRODUCT_IDS.LIFETIME))).toBe('lifetime');
  });

  it('builds a pro entitlement with the correct limits', () => {
    const entitlement = mapCustomerInfoToEntitlement(
      buildPayingCustomerInfo(PRODUCT_IDS.YEARLY),
    );

    expect(entitlement.tier).toBe('pro');
    expect(entitlement.featureLimits).toEqual(TIER_LIMITS.pro);
    expect(entitlement.expiresAt).toBe(now + 30 * 86_400_000);
  });

  it('builds a lifetime entitlement without an expiry', () => {
    const entitlement = mapCustomerInfoToEntitlement(
      buildPayingCustomerInfo(PRODUCT_IDS.LIFETIME),
    );

    expect(entitlement.tier).toBe('lifetime');
    expect(entitlement.featureLimits).toEqual(TIER_LIMITS.lifetime);
    expect(entitlement.expiresAt).toBeNull();
  });

  it('finds matching packages for each WalletPulse plan', () => {
    const offering = buildOffering();

    expect(findPackageForPlan(offering, 'monthly')?.product.identifier).toBe(
      PRODUCT_IDS.MONTHLY,
    );
    expect(findPackageForPlan(offering, 'yearly')?.product.identifier).toBe(
      PRODUCT_IDS.YEARLY,
    );
    expect(findPackageForPlan(offering, 'lifetime')?.product.identifier).toBe(
      PRODUCT_IDS.LIFETIME,
    );
  });
});
