import {navigationRef} from '@presentation/navigation/navigationRef';

function handleNotificationPress(data: Record<string, unknown> | undefined): void {
  if (!data || !navigationRef.isReady()) {return;}

  if (data.type === 'bill_reminder') {
    const billId = (data.billId as string) ?? undefined;
    navigationRef.navigate('MainTabs', {
      screen: 'SettingsTab',
      params: {
        screen: 'BillReminders',
        params: billId ? {highlightBillId: billId} : undefined,
      },
    });
  } else if (data.type === 'subscription_reminder') {
    const subscriptionId = (data.subscriptionId as string) ?? undefined;
    navigationRef.navigate('MainTabs', {
      screen: 'SettingsTab',
      params: {
        screen: 'SubscriptionsList',
        params: subscriptionId ? {highlightSubscriptionId: subscriptionId} : undefined,
      },
    });
  } else if (data.type === 'recurring_charge') {
    const transactionId = (data.transactionId as string) ?? '';
    if (!transactionId) { return; }
    navigationRef.navigate('MainTabs', {
      screen: 'HomeTab',
      params: {
        screen: 'TransactionDetail',
        params: {transactionId},
      },
    });
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
