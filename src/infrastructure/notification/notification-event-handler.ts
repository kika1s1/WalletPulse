import {navigationRef} from '@presentation/navigation/navigationRef';

let pendingBillNav: string | null = null;

export function getPendingBillNav(): string | null {
  const v = pendingBillNav;
  pendingBillNav = null;
  return v;
}

function handleNotificationPress(data: Record<string, unknown> | undefined): void {
  if (!data || data.type !== 'bill_reminder') {return;}

  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', {
      screen: 'SettingsTab',
      params: {
        screen: 'BillReminders',
      },
    });
  } else {
    pendingBillNav = (data.billId as string) ?? null;
  }
}

export function setupNotifeeEventHandlers(): void {
  try {
    const notifee = require('@notifee/react-native').default;
    const {EventType} = require('@notifee/react-native');

    notifee.onForegroundEvent(({type, detail}: {type: number; detail: {notification?: {data?: Record<string, unknown>}}}) => {
      if (type === EventType.PRESS) {
        handleNotificationPress(detail.notification?.data);
      }
    });

    notifee.onBackgroundEvent(async ({type, detail}: {type: number; detail: {notification?: {data?: Record<string, unknown>}}}) => {
      if (type === EventType.PRESS) {
        handleNotificationPress(detail.notification?.data);
      }
    });
  } catch {
    if (__DEV__) {
      console.warn('[BillNotif] Notifee native module not available, notification tap handling disabled');
    }
  }
}

export async function checkInitialNotification(): Promise<void> {
  try {
    const notifee = require('@notifee/react-native').default;
    const initial = await notifee.getInitialNotification();
    if (initial) {
      handleNotificationPress(initial.notification.data as Record<string, unknown> | undefined);
    }
  } catch {
    /* non-fatal */
  }
}
