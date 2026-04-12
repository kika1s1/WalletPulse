import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Platform, StatusBar, View, StyleSheet, PermissionsAndroid} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import {Providers} from './Providers';
import AppNavigator from '@presentation/navigation/AppNavigator';
import {SplashScreen} from '@presentation/components/SplashScreen';
import PinLockScreen from '@presentation/screens/PinLockScreen';
import {usePinStore} from '@presentation/stores/usePinStore';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {
  startNotificationHandler,
  stopNotificationHandler,
} from '@infrastructure/notification/notification-handler';
import {processRecurringItems} from '@infrastructure/recurring/recurring-scheduler';
import {scheduleBillNotifications, cancelAllBillNotifications} from '@infrastructure/notification/bill-reminder-notifications';
import {scheduleSubscriptionNotifications, cancelAllSubscriptionNotifications} from '@infrastructure/notification/subscription-notifications';
import {setupNotifeeEventHandlers, checkInitialNotification} from '@infrastructure/notification/notification-event-handler';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {useTheme} from '@shared/theme';
import {usePurchaseInitialization} from '@presentation/hooks/usePurchaseInitialization';
import {WinbackOfferSheet} from '@presentation/components/common';
import {navigateToPaywall} from '@presentation/navigation/paywall-navigation';

async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) {return;}
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  } catch {
    /* permission request failed, notifications may not work */
  }
}

const RECURRING_SCHEDULER_INTERVAL_MS = 3600_000;

function useRecurringScheduler(splashDone: boolean) {
  const lastRunAtRef = useRef(0);

  const maybeProcessRecurring = useCallback(() => {
    const now = Date.now();
    if (now - lastRunAtRef.current < RECURRING_SCHEDULER_INTERVAL_MS) {
      return;
    }
    lastRunAtRef.current = now;
    void processRecurringItems().catch(() => {
      /* offline-first: failures are non-fatal */
    });
  }, []);

  useEffect(() => {
    if (!splashDone) {
      return;
    }
    maybeProcessRecurring();
  }, [splashDone, maybeProcessRecurring]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        maybeProcessRecurring();
      }
    });
    return () => sub.remove();
  }, [maybeProcessRecurring]);
}

function useGlobalNotificationListener() {
  const notificationEnabled = useSettingsStore((s) => s.notificationEnabled);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') {return;}

    if (notificationEnabled) {
      if (!stopRef.current) {
        stopRef.current = startNotificationHandler();
      }
    } else {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      stopNotificationHandler();
    }

    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [notificationEnabled]);
}

const BILL_SCHEDULE_THROTTLE_MS = 60_000;

function useBillReminderNotifications(splashDone: boolean) {
  const billNotifEnabled = useSettingsStore((s) => s.billReminderNotificationsEnabled);
  const lastScheduleRef = useRef(0);

  const scheduleBills = useCallback(async () => {
    const elapsed = Date.now() - lastScheduleRef.current;
    if (elapsed < BILL_SCHEDULE_THROTTLE_MS) {return;}
    lastScheduleRef.current = Date.now();
    try {
      const ds = getLocalDataSource();
      const unpaid = await ds.billReminders.findUnpaid();
      await scheduleBillNotifications(unpaid);
    } catch {
      /* offline-first: non-fatal */
    }
  }, []);

  useEffect(() => {
    if (!splashDone) {return;}

    if (!billNotifEnabled) {
      void cancelAllBillNotifications();
      return;
    }

    void scheduleBills();
  }, [splashDone, billNotifEnabled, scheduleBills]);

  useEffect(() => {
    if (!splashDone || !billNotifEnabled) {return;}

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void scheduleBills();
      }
    });
    return () => sub.remove();
  }, [splashDone, billNotifEnabled, scheduleBills]);
}

const SUB_SCHEDULE_THROTTLE_MS = 60_000;

function useSubscriptionNotifications(splashDone: boolean) {
  const subNotifEnabled = useSettingsStore((s) => s.subscriptionNotificationsEnabled);
  const lastScheduleRef = useRef(0);

  const scheduleSubs = useCallback(async () => {
    const elapsed = Date.now() - lastScheduleRef.current;
    if (elapsed < SUB_SCHEDULE_THROTTLE_MS) {return;}
    lastScheduleRef.current = Date.now();
    try {
      const ds = getLocalDataSource();
      const active = await ds.subscriptions.findActive();
      await scheduleSubscriptionNotifications(active);
    } catch {
      /* offline-first: non-fatal */
    }
  }, []);

  useEffect(() => {
    if (!splashDone) {return;}

    if (!subNotifEnabled) {
      void cancelAllSubscriptionNotifications();
      return;
    }

    void scheduleSubs();
  }, [splashDone, subNotifEnabled, scheduleSubs]);

  useEffect(() => {
    if (!splashDone || !subNotifEnabled) {return;}

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void scheduleSubs();
      }
    });
    return () => sub.remove();
  }, [splashDone, subNotifEnabled, scheduleSubs]);
}

function AppContent() {
  const {isDark} = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const isLocked = usePinStore((s) => s.isLocked);
  const lock = usePinStore((s) => s.lock);
  const winbackRef = useRef<BottomSheet>(null);

  const {winbackOffer, dismissWinback} = usePurchaseInitialization();
  useGlobalNotificationListener();
  useRecurringScheduler(splashDone);
  useBillReminderNotifications(splashDone);
  useSubscriptionNotifications(splashDone);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && isPinEnabled) {
        lock();
      }
    });
    return () => sub.remove();
  }, [isPinEnabled, lock]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  const showLock = splashDone && isPinEnabled && isLocked;

  useEffect(() => {
    if (winbackOffer && splashDone && !showLock) {
      winbackRef.current?.snapToIndex(0);
    }
  }, [winbackOffer, splashDone, showLock]);

  const handleResubscribe = useCallback(() => {
    winbackRef.current?.close();
    dismissWinback();
    navigateToPaywall('winback');
  }, [dismissWinback]);

  const handleDismissWinback = useCallback(() => {
    winbackRef.current?.close();
    dismissWinback();
  }, [dismissWinback]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={splashDone && !showLock ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor={splashDone && !showLock ? 'transparent' : '#6C5CE7'}
        translucent={splashDone && !showLock}
      />
      {showLock ? <PinLockScreen /> : <AppNavigator />}
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      {winbackOffer && (
        <WinbackOfferSheet
          ref={winbackRef}
          offer={winbackOffer}
          onResubscribe={handleResubscribe}
          onDismiss={handleDismissWinback}
        />
      )}
    </View>
  );
}

setupNotifeeEventHandlers();

export default function App() {
  useEffect(() => {
    void requestNotificationPermission();
    void checkInitialNotification();
  }, []);

  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
