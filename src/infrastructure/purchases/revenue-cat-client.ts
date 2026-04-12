import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type LogInResult,
  type MakePurchaseResult,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, {PAYWALL_RESULT} from 'react-native-purchases-ui';
import {Platform} from 'react-native';
import {
  ENTITLEMENT_IDS,
  REVENUECAT_API_KEY,
} from '@shared/constants/purchase-constants';

let initialized = false;

function hasValidApiKey(): boolean {
  if (REVENUECAT_API_KEY.length === 0) {
    return false;
  }
  const validPrefixes = ['goog_', 'appl_', 'amzn_', 'test_', 'rcb_', 'strp_'];
  return validPrefixes.some(p => REVENUECAT_API_KEY.startsWith(p));
}

export async function initializePurchases(): Promise<boolean> {
  if (initialized) {
    return true;
  }

  if (!hasValidApiKey()) {
    return false;
  }

  try {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    if (Platform.OS === 'android') {
      Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        useAmazon: false,
        shouldShowInAppMessagesAutomatically: true,
        diagnosticsEnabled: __DEV__,
        entitlementVerificationMode:
          Purchases.ENTITLEMENT_VERIFICATION_MODE.DISABLED,
      });
    }

    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await getOfferings();
  return offerings?.current ?? null;
}

export async function refreshCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    await Purchases.invalidateCustomerInfoCache();
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function purchasePackage(
  pkg: PurchasesPackage,
) : Promise<MakePurchaseResult> {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export async function canMakePayments(): Promise<boolean> {
  try {
    return await Purchases.canMakePayments();
  } catch {
    return false;
  }
}

export async function logInToPurchases(
  appUserId: string,
): Promise<LogInResult | null> {
  try {
    return await Purchases.logIn(appUserId);
  } catch {
    return null;
  }
}

export async function logOutFromPurchases(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.logOut();
  } catch {
    return null;
  }
}

export async function getPurchasesAppUserId(): Promise<string | null> {
  try {
    return await Purchases.getAppUserID();
  } catch {
    return null;
  }
}

export async function setPurchasesAttributes(
  attributes: Record<string, string | null>,
): Promise<boolean> {
  try {
    await Purchases.setAttributes(attributes);
    return true;
  } catch {
    return false;
  }
}

export async function presentPaywall(
  offering?: PurchasesOffering | null,
): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywall({
    offering: offering ?? undefined,
  });
}

export async function presentPaywallIfNeeded(
  offering?: PurchasesOffering | null,
): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywallIfNeeded({
    offering: offering ?? undefined,
    requiredEntitlementIdentifier: ENTITLEMENT_IDS.WALLETPULSE_PRO,
  });
}

export async function presentCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}

export function addCustomerInfoUpdateListener(
  listener: CustomerInfoUpdateListener,
): void {
  Purchases.addCustomerInfoUpdateListener(listener);
}

export function removeCustomerInfoUpdateListener(
  listener: CustomerInfoUpdateListener,
): boolean {
  return Purchases.removeCustomerInfoUpdateListener(listener);
}

export function getPurchasesErrorMessage(error: unknown): string {
  const purchasesError = error as PurchasesError | null;
  if (purchasesError?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return 'Purchase cancelled.';
  }
  if (
    purchasesError?.code === Purchases.PURCHASES_ERROR_CODE.NETWORK_ERROR ||
    purchasesError?.code === Purchases.PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR
  ) {
    return 'No internet connection. Please try again.';
  }
  if (purchasesError?.message) {
    return purchasesError.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'RevenueCat request failed.';
}

export function isInitialized(): boolean {
  return initialized;
}
