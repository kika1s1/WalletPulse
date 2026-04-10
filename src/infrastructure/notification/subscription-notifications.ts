import type {Subscription} from '@domain/entities/Subscription';
import {formatAmount} from '@shared/utils/format-currency';

const CHANNEL_ID = 'subscription-reminders';
const NOTIFICATION_ID_PREFIX = 'sub-';

const MS_PER_DAY = 86_400_000;

function getNotifee(): typeof import('@notifee/react-native').default | null {
  try {
    return require('@notifee/react-native').default;
  } catch {
    return null;
  }
}

function getConstants(): {AndroidImportance: {HIGH: number}; TriggerType: {TIMESTAMP: number}} {
  try {
    const mod = require('@notifee/react-native');
    return {AndroidImportance: mod.AndroidImportance, TriggerType: mod.TriggerType};
  } catch {
    return {AndroidImportance: {HIGH: 4}, TriggerType: {TIMESTAMP: 0}};
  }
}

export async function ensureSubscriptionChannel(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}
  const {AndroidImportance} = getConstants();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Subscription Reminders',
    description: 'Notifications for upcoming subscription renewals',
    importance: AndroidImportance.HIGH,
  });
}

function buildNotificationId(subId: string): string {
  return `${NOTIFICATION_ID_PREFIX}${subId}`;
}

function formatDueLabel(dueDate: number, nowMs: number): string {
  const diffMs = dueDate - nowMs;
  if (diffMs < MS_PER_DAY) {return 'renews today';}
  if (diffMs < 2 * MS_PER_DAY) {return 'renews tomorrow';}
  const diffDays = Math.ceil(diffMs / MS_PER_DAY);
  return `renews in ${diffDays} days`;
}

export type SubscriptionNotificationPayload = {
  subscriptionId: string;
  subscriptionName: string;
  amount: string;
  dueLabel: string;
  triggerMs: number;
};

export function computeSubscriptionNotifications(
  subscriptions: Subscription[],
  nowMs: number,
  reminderDays: number = 3,
): SubscriptionNotificationPayload[] {
  const results: SubscriptionNotificationPayload[] = [];
  const windowEnd = nowMs + reminderDays * MS_PER_DAY;

  for (const sub of subscriptions) {
    if (!sub.isActive) {continue;}
    if (sub.cancelledAt !== undefined && sub.cancelledAt !== null) {continue;}
    if (sub.nextDueDate < nowMs) {continue;}
    if (sub.nextDueDate > windowEnd) {continue;}

    const triggerMs = sub.nextDueDate - MS_PER_DAY;
    const effectiveTrigger = Math.max(triggerMs, nowMs + 5000);

    results.push({
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      amount: formatAmount(sub.amount, sub.currency),
      dueLabel: formatDueLabel(sub.nextDueDate, nowMs),
      triggerMs: effectiveTrigger,
    });
  }

  return results;
}

export async function scheduleSubscriptionNotifications(
  subscriptions: Subscription[],
  reminderDays: number = 3,
): Promise<number> {
  const notifee = getNotifee();
  if (!notifee) {return 0;}

  const {AndroidImportance, TriggerType} = getConstants();

  await ensureSubscriptionChannel();

  const existing = await notifee.getTriggerNotificationIds();
  const subNotifIds = existing.filter((id: string) => id.startsWith(NOTIFICATION_ID_PREFIX));
  for (const id of subNotifIds) {
    await notifee.cancelTriggerNotification(id);
  }

  const nowMs = Date.now();
  const payloads = computeSubscriptionNotifications(subscriptions, nowMs, reminderDays);

  for (const p of payloads) {
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: p.triggerMs,
    };

    await notifee.createTriggerNotification(
      {
        id: buildNotificationId(p.subscriptionId),
        title: `${p.subscriptionName} ${p.dueLabel}`,
        body: `${p.amount} will be charged. Tap to view your subscriptions.`,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
        },
        data: {
          type: 'subscription_reminder',
          subscriptionId: p.subscriptionId,
        },
      },
      trigger,
    );
  }

  return payloads.length;
}

export async function cancelAllSubscriptionNotifications(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}

  const existing = await notifee.getTriggerNotificationIds();
  const subNotifIds = existing.filter((id: string) => id.startsWith(NOTIFICATION_ID_PREFIX));
  for (const id of subNotifIds) {
    await notifee.cancelTriggerNotification(id);
  }
}

export async function showImmediateSubscriptionNotification(
  sub: Subscription,
): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}

  const {AndroidImportance} = getConstants();

  await ensureSubscriptionChannel();
  const nowMs = Date.now();
  await notifee.displayNotification({
    id: buildNotificationId(sub.id),
    title: `${sub.name} ${formatDueLabel(sub.nextDueDate, nowMs)}`,
    body: `${formatAmount(sub.amount, sub.currency)} will be charged. Tap to view your subscriptions.`,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      smallIcon: 'ic_launcher',
    },
    data: {
      type: 'subscription_reminder',
      subscriptionId: sub.id,
    },
  });
}

export async function scheduleTestSubscriptionNotification(
  sub: Subscription,
  delaySeconds: number = 10,
): Promise<number> {
  const notifee = getNotifee();
  if (!notifee) {return 0;}

  const {AndroidImportance, TriggerType} = getConstants();

  await ensureSubscriptionChannel();

  const triggerMs = Date.now() + delaySeconds * 1000;

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerMs,
  };

  await notifee.createTriggerNotification(
    {
      id: `${NOTIFICATION_ID_PREFIX}test-${sub.id}`,
      title: `${sub.name} renews soon`,
      body: `${formatAmount(sub.amount, sub.currency)} will be charged. Tap to view your subscriptions.`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
      },
      data: {
        type: 'subscription_reminder',
        subscriptionId: sub.id,
      },
    },
    trigger,
  );

  return delaySeconds;
}
