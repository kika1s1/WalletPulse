import type {BillReminder} from '@domain/entities/BillReminder';
import {formatAmount} from '@shared/utils/format-currency';

const CHANNEL_ID = 'bill-reminders';
const NOTIFICATION_ID_PREFIX = 'bill-';

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

export async function ensureBillReminderChannel(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}
  const {AndroidImportance} = getConstants();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Bill Reminders',
    description: 'Notifications for upcoming bill payments',
    importance: AndroidImportance.HIGH,
  });
}

function buildNotificationId(billId: string): string {
  return `${NOTIFICATION_ID_PREFIX}${billId}`;
}

function formatDueLabel(dueDate: number, nowMs: number): string {
  const diffDays = Math.ceil((dueDate - nowMs) / MS_PER_DAY);
  if (diffDays <= 0) {return 'due today';}
  if (diffDays === 1) {return 'due tomorrow';}
  return `due in ${diffDays} days`;
}

export type BillNotificationPayload = {
  billId: string;
  billName: string;
  amount: string;
  dueLabel: string;
  triggerMs: number;
};

export function computeBillNotifications(
  bills: BillReminder[],
  nowMs: number,
): BillNotificationPayload[] {
  const results: BillNotificationPayload[] = [];

  for (const bill of bills) {
    if (bill.isPaid) {continue;}
    if (bill.remindDaysBefore <= 0) {continue;}

    const triggerMs = bill.dueDate - bill.remindDaysBefore * MS_PER_DAY;

    if (triggerMs < nowMs - MS_PER_DAY) {continue;}

    const effectiveTrigger = Math.max(triggerMs, nowMs + 5000);

    results.push({
      billId: bill.id,
      billName: bill.name,
      amount: formatAmount(bill.amount, bill.currency),
      dueLabel: formatDueLabel(bill.dueDate, effectiveTrigger),
      triggerMs: effectiveTrigger,
    });
  }

  return results;
}

export async function scheduleBillNotifications(
  bills: BillReminder[],
): Promise<number> {
  const notifee = getNotifee();
  if (!notifee) {return 0;}

  const {AndroidImportance, TriggerType} = getConstants();

  await ensureBillReminderChannel();

  const existing = await notifee.getTriggerNotificationIds();
  const billNotifIds = existing.filter((id: string) => id.startsWith(NOTIFICATION_ID_PREFIX));
  for (const id of billNotifIds) {
    await notifee.cancelTriggerNotification(id);
  }

  const nowMs = Date.now();
  const payloads = computeBillNotifications(bills, nowMs);

  for (const p of payloads) {
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: p.triggerMs,
    };

    await notifee.createTriggerNotification(
      {
        id: buildNotificationId(p.billId),
        title: `${p.billName} ${p.dueLabel}`,
        body: `${p.amount} payment upcoming. Tap to view your bills.`,
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
        },
        data: {
          type: 'bill_reminder',
          billId: p.billId,
        },
      },
      trigger,
    );
  }

  return payloads.length;
}

export async function cancelAllBillNotifications(): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}

  const existing = await notifee.getTriggerNotificationIds();
  const billNotifIds = existing.filter((id: string) => id.startsWith(NOTIFICATION_ID_PREFIX));
  for (const id of billNotifIds) {
    await notifee.cancelTriggerNotification(id);
  }
}

export async function showImmediateBillNotification(
  bill: BillReminder,
): Promise<void> {
  const notifee = getNotifee();
  if (!notifee) {return;}

  const {AndroidImportance} = getConstants();

  await ensureBillReminderChannel();
  const nowMs = Date.now();
  await notifee.displayNotification({
    id: buildNotificationId(bill.id),
    title: `${bill.name} ${formatDueLabel(bill.dueDate, nowMs)}`,
    body: `${formatAmount(bill.amount, bill.currency)} payment upcoming. Tap to view your bills.`,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      smallIcon: 'ic_launcher',
    },
    data: {
      type: 'bill_reminder',
      billId: bill.id,
    },
  });
}

export async function scheduleTestBillNotification(
  bill: BillReminder,
  delaySeconds: number = 10,
): Promise<number> {
  const notifee = getNotifee();
  if (!notifee) {return 0;}

  const {AndroidImportance, TriggerType} = getConstants();

  await ensureBillReminderChannel();

  const triggerMs = Date.now() + delaySeconds * 1000;

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerMs,
  };

  await notifee.createTriggerNotification(
    {
      id: `${NOTIFICATION_ID_PREFIX}test-${bill.id}`,
      title: `${bill.name} payment due soon`,
      body: `${formatAmount(bill.amount, bill.currency)} payment upcoming. Tap to view your bills.`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        smallIcon: 'ic_launcher',
      },
      data: {
        type: 'bill_reminder',
        billId: bill.id,
      },
    },
    trigger,
  );

  return delaySeconds;
}
