import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import type {Entitlement, Tier} from '@domain/entities/Entitlement';
import {getTierLimits} from '@domain/entities/tier-config';
import {
  ENTITLEMENT_IDS,
  PRODUCT_IDS,
  type WalletPulsePlanId,
} from '@shared/constants/purchase-constants';

function getActiveEntitlement(
  info: CustomerInfo | null,
): PurchasesEntitlementInfo | null {
  if (!info) {
    return null;
  }

  return (
    info.entitlements.active[ENTITLEMENT_IDS.BUSINESS] ??
    info.entitlements.active[ENTITLEMENT_IDS.WALLETPULSE_PRO] ??
    info.entitlements.active[ENTITLEMENT_IDS.PRO] ??
    null
  );
}

function isLifetimeProduct(productIdentifier: string | null | undefined): boolean {
  if (!productIdentifier) {
    return false;
  }
  return (
    productIdentifier === PRODUCT_IDS.LIFETIME ||
    productIdentifier === 'lifetime' ||
    productIdentifier.includes('lifetime')
  );
}

export function hasWalletPulseProEntitlement(info: CustomerInfo | null): boolean {
  const entitlement =
    info?.entitlements.active[ENTITLEMENT_IDS.WALLETPULSE_PRO] ??
    info?.entitlements.active[ENTITLEMENT_IDS.PRO];

  return entitlement?.isActive === true;
}

export function getActivePlanId(
  info: CustomerInfo | null,
): WalletPulsePlanId | null {
  if (!info) {
    return null;
  }

  const entitlement =
    info.entitlements.active[ENTITLEMENT_IDS.WALLETPULSE_PRO] ??
    info.entitlements.active[ENTITLEMENT_IDS.PRO] ??
    null;
  const productIdentifier = entitlement?.productIdentifier ?? null;

  if (
    isLifetimeProduct(productIdentifier) ||
    info.allPurchasedProductIdentifiers.includes(PRODUCT_IDS.LIFETIME)
  ) {
    return 'lifetime';
  }

  if (
    productIdentifier === PRODUCT_IDS.YEARLY ||
    productIdentifier === 'yearly' ||
    (productIdentifier && productIdentifier.includes('yearly'))
  ) {
    return 'yearly';
  }

  if (
    productIdentifier === PRODUCT_IDS.MONTHLY ||
    productIdentifier === 'monthly' ||
    (productIdentifier && productIdentifier.includes('monthly'))
  ) {
    return 'monthly';
  }

  const yearlyIds = [PRODUCT_IDS.YEARLY, 'yearly', 'walletpulse_pro_yearly'];
  const monthlyIds = [PRODUCT_IDS.MONTHLY, 'monthly', 'walletpulse_pro_monthly'];

  if (yearlyIds.some(id => info.activeSubscriptions.includes(id))) {
    return 'yearly';
  }

  if (monthlyIds.some(id => info.activeSubscriptions.includes(id))) {
    return 'monthly';
  }

  return null;
}

export function mapCustomerInfoToTier(info: CustomerInfo | null): Tier {
  if (!info) {
    return 'free';
  }

  if (info.entitlements.active[ENTITLEMENT_IDS.BUSINESS]?.isActive) {
    return 'business';
  }

  if (!hasWalletPulseProEntitlement(info)) {
    return 'free';
  }

  return getActivePlanId(info) === 'lifetime' ? 'lifetime' : 'pro';
}

export function mapCustomerInfoToEntitlement(
  info: CustomerInfo | null,
): Entitlement {
  const tier = mapCustomerInfoToTier(info);
  const entitlementInfo = getActiveEntitlement(info);
  const isTrialing = entitlementInfo?.periodType === 'TRIAL';
  const purchasedAt = entitlementInfo?.originalPurchaseDateMillis ?? null;
  const expiresAt =
    tier === 'lifetime' ? null : entitlementInfo?.expirationDateMillis ?? null;
  const trialEndsAt = isTrialing
    ? (entitlementInfo?.expirationDateMillis ?? null)
    : null;

  return {
    id: `ent-${tier}-${purchasedAt ?? 0}`,
    tier,
    featureLimits: getTierLimits(tier),
    isTrialing,
    trialEndsAt,
    expiresAt,
    purchasedAt,
  };
}

function matchesPackageType(
  pkg: PurchasesPackage,
  planId: WalletPulsePlanId,
): boolean {
  switch (planId) {
    case 'monthly':
      return pkg.packageType === 'MONTHLY';
    case 'yearly':
      return pkg.packageType === 'ANNUAL';
    case 'lifetime':
      return pkg.packageType === 'LIFETIME';
    default:
      return false;
  }
}

function matchesProductId(
  pkg: PurchasesPackage,
  planId: WalletPulsePlanId,
): boolean {
  switch (planId) {
    case 'monthly':
      return pkg.product.identifier === PRODUCT_IDS.MONTHLY;
    case 'yearly':
      return pkg.product.identifier === PRODUCT_IDS.YEARLY;
    case 'lifetime':
      return pkg.product.identifier === PRODUCT_IDS.LIFETIME;
    default:
      return false;
  }
}

export function findPackageForPlan(
  offering: PurchasesOffering | null,
  planId: WalletPulsePlanId,
): PurchasesPackage | null {
  if (!offering) {
    return null;
  }

  const directMatch =
    planId === 'monthly'
      ? offering.monthly
      : planId === 'yearly'
        ? offering.annual
        : offering.lifetime;

  if (directMatch) {
    return directMatch;
  }

  return (
    offering.availablePackages.find(
      pkg => matchesPackageType(pkg, planId) || matchesProductId(pkg, planId),
    ) ?? null
  );
}

export function getCustomerManagementUrl(info: CustomerInfo | null): string | null {
  return info?.managementURL ?? null;
}
