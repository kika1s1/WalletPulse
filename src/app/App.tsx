import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Platform, StatusBar, View, StyleSheet} from 'react-native';
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
import {setupNotifeeEventHandlers, checkInitialNotification} from '@infrastructure/notification/notification-event-handler';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {useTheme} from '@shared/theme';

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
    if (Platform.OS !== 'android') return;

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

function useBillReminderNotifications(splashDone: boolean) {
  const billNotifEnabled = useSettingsStore((s) => s.billReminderNotificationsEnabled);

  useEffect(() => {
    if (!splashDone) return;

    if (!billNotifEnabled) {
      void cancelAllBillNotifications();
      return;
    }

    void (async () => {
      try {
        const ds = getLocalDataSource();
        const unpaid = await ds.billReminders.findUnpaid();
        await scheduleBillNotifications(unpaid);
      } catch {
        /* offline-first: non-fatal */
      }
    })();
  }, [splashDone, billNotifEnabled]);

  useEffect(() => {
    if (!splashDone || !billNotifEnabled) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void (async () => {
          try {
            const ds = getLocalDataSource();
            const unpaid = await ds.billReminders.findUnpaid();
            await scheduleBillNotifications(unpaid);
          } catch {
            /* non-fatal */
          }
        })();
      }
    });
    return () => sub.remove();
  }, [splashDone, billNotifEnabled]);
}

function AppContent() {
  const {isDark} = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const isPinEnabled = usePinStore((s) => s.isPinEnabled);
  const isLocked = usePinStore((s) => s.isLocked);
  const lock = usePinStore((s) => s.lock);

  useGlobalNotificationListener();
  useRecurringScheduler(splashDone);
  useBillReminderNotifications(splashDone);

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

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={splashDone && !showLock ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor={splashDone && !showLock ? 'transparent' : '#6C5CE7'}
        translucent={splashDone && !showLock}
      />
      {showLock ? <PinLockScreen /> : <AppNavigator />}
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
    </View>
  );
}

setupNotifeeEventHandlers();

export default function App() {
  useEffect(() => {
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
