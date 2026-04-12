import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  disposeEntitlementStoreListener,
  useEntitlementStore,
} from '@presentation/stores/useEntitlementStore';
import {CheckTrialStatus} from '@domain/usecases/check-trial-status';
import {CheckWinbackEligibility} from '@domain/usecases/check-winback-eligibility';
import type {WinbackOffer} from '@domain/usecases/check-winback-eligibility';
import {
  scheduleTrialReminders,
  cancelTrialReminders,
} from '@infrastructure/notifications/trial-reminders';
import {scheduleRetentionNotification} from '@infrastructure/notifications/retention-notifications';
import {monetizationAnalytics} from '@infrastructure/analytics/monetization-events';
import {
  setupDeepLinkHandler,
  removeDeepLinkHandler,
  handleInitialDeepLink,
} from '@infrastructure/purchases/deep-link-handler';

const WINBACK_SHOWN_KEY = '@walletpulse/winback_shown';
const PREVIOUS_TIER_KEY = '@walletpulse/previous_tier';
const CANCELLED_AT_KEY = '@walletpulse/cancelled_at';
const LAST_ACTIVE_KEY = '@walletpulse/last_active_ts';
const INACTIVE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

export type PurchaseInitResult = {
  isReady: boolean;
  winbackOffer: WinbackOffer | null;
  dismissWinback: () => void;
};

export function usePurchaseInitialization(): PurchaseInitResult {
  const initialized = useEntitlementStore((state) => state.initialized);
  const initialize = useEntitlementStore((state) => state.initialize);
  const entitlement = useEntitlementStore((state) => state.entitlement);
  const [winbackOffer, setWinbackOffer] = useState<WinbackOffer | null>(null);
  const hasRunPostInit = useRef(false);

  useEffect(() => {
    void initialize();
    void handleInitialDeepLink();

    const refresh = useEntitlementStore.getState().refresh;
    setupDeepLinkHandler(() => {
      void refresh();
    });

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => {
      disposeEntitlementStoreListener();
      removeDeepLinkHandler();
      appStateSub.remove();
    };
  }, [initialize]);

  const handlePostInit = useCallback(async () => {
    if (!initialized || hasRunPostInit.current) {
      return;
    }
    hasRunPostInit.current = true;

    const trialChecker = new CheckTrialStatus();
    const trialStatus = trialChecker.execute({
      isTrialing: entitlement.isTrialing,
      trialEndsAt: entitlement.trialEndsAt,
      trialStartedAt: entitlement.purchasedAt,
    });

    if (trialStatus.isActive && entitlement.purchasedAt) {
      void scheduleTrialReminders(entitlement.purchasedAt);
      void monetizationAnalytics.trackTrialStarted(entitlement.tier);
    } else if (trialStatus.isExpired || !entitlement.isTrialing) {
      void cancelTrialReminders();
    }

    try {
      const lastActiveStr = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
      if (lastActive > 0 && Date.now() - lastActive > INACTIVE_THRESHOLD_MS) {
        void scheduleRetentionNotification('inactive_user', {transactionCount: 0});
      }
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    } catch {
      // Non-fatal
    }

    if (entitlement.tier !== 'free') {
      try {
        await AsyncStorage.setItem(PREVIOUS_TIER_KEY, entitlement.tier);
        await AsyncStorage.removeItem(CANCELLED_AT_KEY);
      } catch {
        // Non-fatal: tier persistence failure
      }
      return;
    }

    try {
      const [prevTier, cancelledAtStr, alreadyShown] = await Promise.all([
        AsyncStorage.getItem(PREVIOUS_TIER_KEY),
        AsyncStorage.getItem(CANCELLED_AT_KEY),
        AsyncStorage.getItem(WINBACK_SHOWN_KEY),
      ]);

      if (prevTier && prevTier !== 'free') {
        if (!cancelledAtStr) {
          await AsyncStorage.setItem(CANCELLED_AT_KEY, String(Date.now()));
        }

        const cancelledAt = cancelledAtStr ? Number(cancelledAtStr) : Date.now();
        const winback = new CheckWinbackEligibility();
        const offer = winback.execute({
          previousTier: prevTier as 'pro' | 'business',
          cancelledAt,
          alreadyShown: alreadyShown === 'true',
        });

        if (offer) {
          setWinbackOffer(offer);
          void monetizationAnalytics.trackWinbackShown(offer.id);
        }
      }
    } catch {
      // Non-fatal: winback check failure should not block the app
    }
  }, [initialized, entitlement]);

  useEffect(() => {
    void handlePostInit();
  }, [handlePostInit]);

  const dismissWinback = useCallback(() => {
    setWinbackOffer(null);
    void AsyncStorage.setItem(WINBACK_SHOWN_KEY, 'true');
    if (winbackOffer) {
      void monetizationAnalytics.trackUpgradePromptDismissed(
        `winback_${winbackOffer.id}`,
      );
    }
  }, [winbackOffer]);

  return {isReady: initialized, winbackOffer, dismissWinback};
}
