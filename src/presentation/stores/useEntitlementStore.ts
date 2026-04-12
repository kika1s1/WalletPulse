import {create} from 'zustand';
import type {CustomerInfo, CustomerInfoUpdateListener} from 'react-native-purchases';
import type {Entitlement} from '@domain/entities/Entitlement';
import {TIER_LIMITS} from '@domain/entities/tier-config';
import {
  PLAN_LABELS,
  type WalletPulsePlanId,
} from '@shared/constants/purchase-constants';
import {
  getActivePlanId,
  getCustomerManagementUrl,
  mapCustomerInfoToEntitlement,
} from '@infrastructure/purchases/entitlement-map';
import type {
  PaywallPresentationResult,
  PurchaseOffering,
  PurchasePackage,
  PurchaseResult,
} from '@infrastructure/purchases/purchase-types';
import {purchaseService} from '@infrastructure/purchases/PurchaseService';
import {
  addCustomerInfoUpdateListener,
  getPurchasesAppUserId,
  initializePurchases,
  isInitialized,
  removeCustomerInfoUpdateListener,
} from '@infrastructure/purchases/revenue-cat-client';
import {getOrCreateAppUserId} from '@infrastructure/purchases/app-user-id';

type EntitlementState = {
  initialized: boolean;
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  appUserId: string | null;
  customerInfo: CustomerInfo | null;
  entitlement: Entitlement;
  currentPlanId: WalletPulsePlanId | null;
  currentPlanLabel: string;
  managementUrl: string | null;
  offering: PurchaseOffering | null;
  availablePackages: PurchasePackage[];
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  purchasePlan: (planId: WalletPulsePlanId) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
  presentPaywall: () => Promise<PaywallPresentationResult>;
  presentPaywallIfNeeded: () => Promise<PaywallPresentationResult>;
  openCustomerCenter: () => Promise<boolean>;
};

const FREE_ENTITLEMENT: Entitlement = {
  id: 'ent-free',
  tier: 'free',
  featureLimits: {...TIER_LIMITS.free},
  isTrialing: false,
  trialEndsAt: null,
  expiresAt: null,
  purchasedAt: null,
};

let customerInfoListener: CustomerInfoUpdateListener | null = null;

async function syncRevenueCatState(
  set: (
    partial:
      | Partial<EntitlementState>
      | ((state: EntitlementState) => Partial<EntitlementState>),
  ) => void,
  customerInfo?: CustomerInfo | null,
  overrides: Partial<EntitlementState> = {},
): Promise<void> {
  try {
    const info = customerInfo ?? (await purchaseService.getCustomerInfo());
    const [offering, appUserId] = await Promise.all([
      purchaseService.getOffering(),
      getPurchasesAppUserId(),
    ]);

    const currentPlanId = getActivePlanId(info);

    set({
      initialized: true,
      isLoading: false,
      isBusy: false,
      appUserId,
      customerInfo: info,
      entitlement: mapCustomerInfoToEntitlement(info),
      currentPlanId,
      currentPlanLabel: currentPlanId ? PLAN_LABELS[currentPlanId] : 'Free',
      managementUrl: getCustomerManagementUrl(info),
      offering,
      availablePackages: offering?.availablePackages ?? [],
      ...overrides,
    });
  } catch (err) {
    const message =
      overrides.error ??
      (err instanceof Error ? err.message : 'Failed to sync purchase state');
    set({
      initialized: true,
      isLoading: false,
      isBusy: false,
      error: message,
      ...overrides,
    });
  }
}

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  initialized: false,
  isLoading: false,
  isBusy: false,
  error: null,
  appUserId: null,
  customerInfo: null,
  entitlement: FREE_ENTITLEMENT,
  currentPlanId: null,
  currentPlanLabel: 'Free',
  managementUrl: null,
  offering: null,
  availablePackages: [],
  initialize: async () => {
    if (get().initialized && isInitialized()) {
      return;
    }

    set({isLoading: true, error: null});

    const ready = await initializePurchases();
    if (!ready) {
      const [offering, fallbackUserId] = await Promise.all([
        purchaseService.getOffering(),
        getOrCreateAppUserId(),
      ]);
      set({
        initialized: true,
        isLoading: false,
        entitlement: FREE_ENTITLEMENT,
        appUserId: fallbackUserId,
        offering,
        availablePackages: offering?.availablePackages ?? [],
        error: null,
      });
      return;
    }

    await syncRevenueCatState(set);

    if (!customerInfoListener) {
      customerInfoListener = (info) => {
        void syncRevenueCatState(set, info);
      };
      addCustomerInfoUpdateListener(customerInfoListener);
    }
  },
  refresh: async () => {
    set({isLoading: true, error: null});
    await syncRevenueCatState(set);
  },
  clearError: () => {
    set({error: null});
  },
  purchasePlan: async (planId) => {
    set({isBusy: true, error: null});
    const result = await purchaseService.purchasePlan(planId);

    if (result.customerInfo) {
      await syncRevenueCatState(set, result.customerInfo, {
        error: result.success ? null : result.errorMessage,
      });
    } else {
      set({isBusy: false, error: result.success ? null : result.errorMessage});
    }

    return result;
  },
  restorePurchases: async () => {
    set({isBusy: true, error: null});
    const result = await purchaseService.restore();

    if (result.customerInfo) {
      await syncRevenueCatState(set, result.customerInfo, {
        error: result.success ? null : result.errorMessage,
      });
    } else {
      set({isBusy: false, error: result.errorMessage});
    }

    return result;
  },
  presentPaywall: async () => {
    set({isBusy: true, error: null});
    const result = await purchaseService.presentPaywall();

    if (result.customerInfo) {
      await syncRevenueCatState(set, result.customerInfo, {
        error: result.success ? null : result.errorMessage,
      });
    } else {
      set({isBusy: false, error: result.errorMessage});
    }

    return result;
  },
  presentPaywallIfNeeded: async () => {
    set({isBusy: true, error: null});
    const result = await purchaseService.presentPaywallIfNeeded();

    if (result.customerInfo) {
      await syncRevenueCatState(set, result.customerInfo, {
        error: result.success ? null : result.errorMessage,
      });
    } else {
      set({isBusy: false, error: result.errorMessage});
    }

    return result;
  },
  openCustomerCenter: async () => {
    set({isBusy: true, error: null});
    const result = await purchaseService.openCustomerCenter();
    await syncRevenueCatState(set, undefined, {
      error: result.success ? null : result.errorMessage,
    });
    return result.success;
  },
}));

export function disposeEntitlementStoreListener(): void {
  if (!customerInfoListener) {
    return;
  }

  removeCustomerInfoUpdateListener(customerInfoListener);
  customerInfoListener = null;
}
