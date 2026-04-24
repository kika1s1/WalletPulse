import type {RecurringChargeNotification} from '@infrastructure/recurring/recurring-scheduler-core';
import {formatAmount} from '@shared/utils/format-currency';

const CHANNEL_ID = 'recurring-charges';
const NOTIFICATION_ID_PREFIX = 'recurring-tx-';

function getNotifee(): typeof import('@notifee/react-native').default | null {
  try {
    return require('@notifee/react-native').default;
  } catch {
    return null;
  }
}

function getConstants(): {AndroidImportance: {HIGH: number}} {
  try {
    const mod = require('@notifee/react-native');
    return {AndroidImportance: mod.AndroidImportance};
  } catch {
    return {AndroidImportance: {HIGH: 4}};
  }
}

export async function ensureRecurringChargeChannel(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}
  const {AndroidImportance} = getConstants();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Recurring Transactions',
    description: 'Notifications when a recurring transaction is auto-posted to a wallet',
    importance: AndroidImportance.HIGH,
  });
}

function buildNotificationId(transactionId: string): string {
  return `${NOTIFICATION_ID_PREFIX}${transactionId}`;
}

export type RecurringChargeNotificationContent = {
  title: string;
  body: string;
};

export function buildRecurringChargeContent(
  n: Pick<RecurringChargeNotification, 'type' | 'merchant' | 'amount' | 'currency' | 'source'>,
  walletName: string,
): RecurringChargeNotificationContent {
  const formatted = formatAmount(n.amount, n.currency);
  const sign = n.type === 'income' ? '+' : '-';
  const merchant = n.merchant.trim() || (n.type === 'income' ? 'Recurring income' : 'Recurring charge');

  if (n.type === 'income') {
    return {
      title: `${sign}${formatted} from ${merchant}`,
      body: `Added to ${walletName} from your recurring schedule.`,
    };
  }

  // expense (subscriptions, bills, recurring expenses)
  const verb = n.source === 'subscription'
    ? 'Subscription charged'
    : n.source === 'bill'
      ? 'Bill paid'
      : 'Charged';
  return {
    title: `${sign}${formatted} to ${merchant}`,
    body: `${verb} from ${walletName} via your recurring schedule.`,
  };
}

export type ShowRecurringChargeInput = RecurringChargeNotification & {
  walletName: string;
};

export async function showRecurringChargeNotification(
  input: ShowRecurringChargeInput,
): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}

  const {AndroidImportance} = getConstants();
  await ensureRecurringChargeChannel();

  const {title, body} = buildRecurringChargeContent(input, input.walletName);

  await notifee.displayNotification({
    id: buildNotificationId(input.transactionId),
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {id: 'default'},
      smallIcon: 'ic_launcher',
    },
    data: {
      type: 'recurring_charge',
      transactionId: input.transactionId,
    },
  });
}
