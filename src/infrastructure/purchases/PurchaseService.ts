import type {CustomerInfo, PurchasesOffering} from 'react-native-purchases';
import {PAYWALL_RESULT} from 'react-native-purchases-ui';
import {
  PLAN_LABELS,
  PLAN_PRICES,
  type WalletPulsePlanId,
} from '@shared/constants/purchase-constants';
import {
  findPackageForPlan,
  getActivePlanId,
} from './entitlement-map';
import type {
  PaywallPresentationResult,
  PurchaseOffering,
  PurchasePackage,
  PurchaseResult,
} from './purchase-types';
import {
  canMakePayments,
  getCurrentOffering,
  getCustomerInfo,
  getPurchasesErrorMessage,
  isInitialized,
  presentCustomerCenter,
  presentPaywall as presentRevenueCatPaywall,
  presentPaywallIfNeeded as presentRevenueCatPaywallIfNeeded,
  purchasePackage,
  refreshCustomerInfo,
  restorePurchases,
} from './revenue-cat-client';
import {isWebPurchaseConfigured, openWebPurchase} from './web-purchase';

const ORDERED_PLANS: WalletPulsePlanId[] = ['monthly', 'yearly', 'lifetime'];

function getPlanDescription(planId: WalletPulsePlanId): string {
  switch (planId) {
    case 'monthly':
      return 'Flexible monthly access to Walletpulse Pro.';
    case 'yearly':
      return 'Best value for long-term Walletpulse Pro access.';
    case 'lifetime':
      return 'One-time purchase for permanent Walletpulse Pro access.';
    default:
      return 'Walletpulse Pro plan.';
  }
}

function mapPackage(planId: WalletPulsePlanId, pkg: NonNullable<ReturnType<typeof findPackageForPlan>>): PurchasePackage {
  return {
    identifier: pkg.identifier,
    packageType: pkg.packageType,
    planId,
    product: {
      id: pkg.product.identifier,
      title: PLAN_LABELS[planId],
      description: pkg.product.description || getPlanDescription(planId),
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      pricePerMonthString: pkg.product.pricePerMonthString,
      pricePerYearString: pkg.product.pricePerYearString,
    },
  };
}

function buildFallbackPackage(planId: WalletPulsePlanId): PurchasePackage {
  const prices = PLAN_PRICES[planId];
  return {
    identifier: `$rc_${planId === 'yearly' ? 'annual' : planId}`,
    packageType: planId === 'monthly' ? 'MONTHLY' : planId === 'yearly' ? 'ANNUAL' : 'LIFETIME',
    planId,
    product: {
      id: `walletpulse_pro_${planId}`,
      title: PLAN_LABELS[planId],
      description: getPlanDescription(planId),
      priceString: prices.amount,
      price: parseFloat(prices.amount.replace('$', '')),
      currencyCode: 'USD',
      pricePerMonthString: planId === 'monthly' ? prices.amount : null,
      pricePerYearString: planId === 'yearly' ? prices.amount : null,
    },
  };
}

function mapOffering(offering: PurchasesOffering | null): PurchaseOffering | null {
  if (!offering) {
    return null;
  }

  const availablePackages = ORDERED_PLANS.map(planId => {
    const pkg = findPackageForPlan(offering, planId);
    return pkg ? mapPackage(planId, pkg) : null;
  }).filter((pkg): pkg is PurchasePackage => pkg !== null);

  return {
    identifier: offering.identifier,
    availablePackages,
  };
}

function buildWebFallbackOffering(): PurchaseOffering {
  return {
    identifier: 'default',
    availablePackages: ORDERED_PLANS.map(buildFallbackPackage),
  };
}

async function buildPaywallResult(
  result: PAYWALL_RESULT,
): Promise<PaywallPresentationResult> {
  if (result === PAYWALL_RESULT.PURCHASED) {
    return {
      success: true,
      purchased: true,
      restored: false,
      errorMessage: null,
      customerInfo: await refreshCustomerInfo(),
    };
  }

  if (result === PAYWALL_RESULT.RESTORED) {
    return {
      success: true,
      purchased: false,
      restored: true,
      errorMessage: null,
      customerInfo: await refreshCustomerInfo(),
    };
  }

  if (result === PAYWALL_RESULT.CANCELLED) {
    return {
      success: false,
      purchased: false,
      restored: false,
      errorMessage: 'Paywall dismissed.',
      customerInfo: await getCustomerInfo(),
    };
  }

  if (result === PAYWALL_RESULT.NOT_PRESENTED) {
    return {
      success: false,
      purchased: false,
      restored: false,
      errorMessage: 'Paywall was not presented.',
      customerInfo: await getCustomerInfo(),
    };
  }

  return {
    success: false,
    purchased: false,
    restored: false,
    errorMessage: 'Paywall failed to load.',
    customerInfo: await getCustomerInfo(),
  };
}

export class PurchaseService {
  async getOffering(): Promise<PurchaseOffering | null> {
    if (isWebPurchaseConfigured()) {
      return buildWebFallbackOffering();
    }
    return mapOffering(await getCurrentOffering());
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    return getCustomerInfo();
  }

  async purchasePlan(planId: WalletPulsePlanId): Promise<PurchaseResult> {
    if (isWebPurchaseConfigured()) {
      const result = await openWebPurchase(planId);
      if (!result.success) {
        return {
          success: false,
          customerInfo: await getCustomerInfo(),
          productId: null,
          transactionId: null,
          errorMessage: result.errorMessage ?? 'Web purchase failed.',
        };
      }
      return {
        success: true,
        customerInfo: await getCustomerInfo(),
        productId: `walletpulse_pro_${planId}`,
        transactionId: null,
        errorMessage: null,
      };
    }

    if (!(await canMakePayments())) {
      return {
        success: false,
        customerInfo: await getCustomerInfo(),
        productId: null,
        transactionId: null,
        errorMessage: 'Payments are not available on this device.',
      };
    }

    const offering = await getCurrentOffering();
    const pkg = findPackageForPlan(offering, planId);

    if (!pkg) {
      return {
        success: false,
        customerInfo: await getCustomerInfo(),
        productId: null,
        transactionId: null,
        errorMessage:
          'The selected RevenueCat package is missing from the current offering.',
      };
    }

    try {
      const result = await purchasePackage(pkg);
      return {
        success: true,
        customerInfo: result.customerInfo,
        productId: result.productIdentifier,
        transactionId: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        customerInfo: await getCustomerInfo(),
        productId: null,
        transactionId: null,
        errorMessage: getPurchasesErrorMessage(error),
      };
    }
  }

  async restore(): Promise<PurchaseResult> {
    try {
      const customerInfo = await restorePurchases();
      const activePlanId = getActivePlanId(customerInfo);

      if (!customerInfo || !activePlanId) {
        return {
          success: false,
          customerInfo,
          productId: null,
          transactionId: null,
          errorMessage: 'No previous Walletpulse Pro purchases were found.',
        };
      }

      return {
        success: true,
        customerInfo,
        productId: activePlanId,
        transactionId: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        customerInfo: await getCustomerInfo(),
        productId: null,
        transactionId: null,
        errorMessage: getPurchasesErrorMessage(error),
      };
    }
  }

  async presentPaywall(): Promise<PaywallPresentationResult> {
    try {
      return await buildPaywallResult(await presentRevenueCatPaywall());
    } catch (error) {
      return {
        success: false,
        purchased: false,
        restored: false,
        errorMessage: getPurchasesErrorMessage(error),
        customerInfo: await getCustomerInfo(),
      };
    }
  }

  async presentPaywallIfNeeded(): Promise<PaywallPresentationResult> {
    try {
      return await buildPaywallResult(await presentRevenueCatPaywallIfNeeded());
    } catch (error) {
      return {
        success: false,
        purchased: false,
        restored: false,
        errorMessage: getPurchasesErrorMessage(error),
        customerInfo: await getCustomerInfo(),
      };
    }
  }

  async openCustomerCenter(): Promise<{success: boolean; errorMessage: string | null}> {
    try {
      await presentCustomerCenter();
      return {
        success: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: getPurchasesErrorMessage(error),
      };
    }
  }
}

export const purchaseService = new PurchaseService();
