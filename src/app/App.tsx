import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, Platform, StatusBar, Text, View, StyleSheet, PermissionsAndroid} from 'react-native';
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
import {showRecurringChargeNotification} from '@infrastructure/notification/recurring-charge-notifications';
import {setupNotifeeEventHandlers, checkInitialNotification} from '@infrastructure/notification/notification-event-handler';
import {enqueueRecurringPeriodic} from '@infrastructure/native/RecurringSchedulerBridge';
import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import type {RecurringChargeNotification} from '@infrastructure/recurring/recurring-scheduler-core';
import {useTheme} from '@shared/theme';
import {makeShouldProcessNotification} from '@shared/utils/notification-package-filter';

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
// WorkManager's minimum periodic interval is 15 minutes. 60 minutes is a
// good battery / freshness trade-off for this app — recurring transactions
// have day-level granularity, so missing a 60-minute window is fine.
const RECURRING_BACKGROUND_INTERVAL_MIN = 60;

function useRecurringScheduler(splashDone: boolean) {
  const lastRunAtRef = useRef(0);
  const periodicEnqueuedRef = useRef(false);
  const recurringChargeNotificationsEnabled = useSettingsStore(
    (s) => s.recurringChargeNotificationsEnabled,
  );

  const resolveWalletName = useCallback(async (walletId: string): Promise<string> => {
    try {
      if (!isDataSourceReady()) { return 'Wallet'; }
      const ds = getSupabaseDataSource();
      const wallet = await ds.wallets.findById(walletId);
      return wallet?.name ?? 'Wallet';
    } catch {
      return 'Wallet';
    }
  }, []);

  const maybeProcessRecurring = useCallback(() => {
    const now = Date.now();
    if (now - lastRunAtRef.current < RECURRING_SCHEDULER_INTERVAL_MS) {
      return;
    }
    lastRunAtRef.current = now;

    const queue: RecurringChargeNotification[] = [];
    void processRecurringItems({
      emit: (n) => queue.push(n),
    })
      .then(async () => {
        if (!recurringChargeNotificationsEnabled || queue.length === 0) { return; }
        for (const n of queue) {
          try {
            const walletName = await resolveWalletName(n.walletId);
            await showRecurringChargeNotification({...n, walletName});
          } catch {
            /* per-notification failure is non-fatal */
          }
        }
      })
      .catch(() => {
        /* offline-first: failures are non-fatal */
      });
  }, [recurringChargeNotificationsEnabled, resolveWalletName]);

  useEffect(() => {
    if (!splashDone) {
      return;
    }
    maybeProcessRecurring();
    // Schedule the periodic WorkManager job once per cold start. The
    // native side uses ExistingPeriodicWorkPolicy.KEEP, so calling this
    // on every splash is idempotent.
    if (!periodicEnqueuedRef.current) {
      periodicEnqueuedRef.current = true;
      void enqueueRecurringPeriodic(RECURRING_BACKGROUND_INTERVAL_MIN);
    }
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
  const monitoredAppPackageIds = useSettingsStore((s) => s.monitoredAppPackageIds);
  const handlerOpts = useMemo(
    () => ({shouldProcessPackage: makeShouldProcessNotification(monitoredAppPackageIds)}),
    [monitoredAppPackageIds],
  );
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') {return;}

    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    stopNotificationHandler();

    if (notificationEnabled) {
      stopRef.current = startNotificationHandler(undefined, handlerOpts);
    }

    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, [notificationEnabled, handlerOpts]);
}

const BILL_SCHEDULE_THROTTLE_MS = 60_000;

function useBillReminderNotifications(splashDone: boolean) {
  const billNotifEnabled = useSettingsStore((s) => s.billReminderNotificationsEnabled);
  const lastScheduleRef = useRef(0);

  const scheduleBills = useCallback(async () => {
    if (!isDataSourceReady()) { return; }
    const elapsed = Date.now() - lastScheduleRef.current;
    if (elapsed < BILL_SCHEDULE_THROTTLE_MS) {return;}
    lastScheduleRef.current = Date.now();
    try {
      const ds = getSupabaseDataSource();
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
    if (!isDataSourceReady()) { return; }
    const elapsed = Date.now() - lastScheduleRef.current;
    if (elapsed < SUB_SCHEDULE_THROTTLE_MS) {return;}
    lastScheduleRef.current = Date.now();
    try {
      const ds = getSupabaseDataSource();
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
  const {isDark, colors} = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const [appState, setAppState] = useState<string>(AppState.currentState);
  const isHydrated = usePinStore((s) => s.isHydrated);
  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const isLocked = usePinStore((s) => s.isLocked);
  const lock = usePinStore((s) => s.lock);
  const markActive = usePinStore((s) => s.markActive);
  const shouldLock = usePinStore((s) => s.shouldLock);
  const hydrateFromStorage = usePinStore((s) => s.hydrateFromStorage);
  useGlobalNotificationListener();
  useRecurringScheduler(splashDone);
  useBillReminderNotifications(splashDone);
  useSubscriptionNotifications(splashDone);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
      if (!isPinEnabled) {
        return;
      }
      if (nextState === 'background' || nextState === 'inactive') {
        // Record when we left the foreground and lock immediately so any
        // task-switcher preview or resume frame is already covered.
        markActive();
        lock();
      } else if (nextState === 'active') {
        if (shouldLock()) {
          lock();
        } else {
          markActive();
        }
      }
    });
    return () => sub.remove();
  }, [isPinEnabled, lock, markActive, shouldLock]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  const ready = splashDone && isHydrated;
  const showLock = ready && isPinEnabled && isLocked;
  // While backgrounded/inactive with a PIN set, always cover the UI so the
  // OS task-switcher preview and transition frames never leak content.
  const showPrivacyCurtain =
    isPinEnabled && appState !== 'active';

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={ready && !showLock ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor={ready && !showLock ? 'transparent' : '#6C5CE7'}
        translucent={ready && !showLock}
      />
      {ready ? (
        showLock ? <PinLockScreen /> : <AppNavigator />
      ) : (
        <View style={[styles.hydrating, {backgroundColor: colors.background}]} />
      )}
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      {showPrivacyCurtain && (
        <View
          pointerEvents="none"
          style={[styles.privacyCurtain, {backgroundColor: colors.background}]}>
          <Text style={[styles.privacyLabel, {color: colors.textSecondary}]}>
            WalletPulse
          </Text>
        </View>
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
  hydrating: {
    flex: 1,
  },
  privacyCurtain: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
