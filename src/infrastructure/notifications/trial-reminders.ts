import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';

const CHANNEL_ID = 'walletpulse_trial';
const REMINDER_TAG = 'trial_reminder';

const REMINDERS = [
  {
    day: 1,
    title: 'Welcome to WalletPulse Pro!',
    body: 'Your Pro trial has started! Explore unlimited wallets, budgets, and analytics.',
  },
  {
    day: 7,
    title: 'One week of Pro',
    body: 'You have been tracking expenses like a pro. Keep going!',
  },
  {
    day: 12,
    title: 'Your trial ends in 2 days',
    body: 'Subscribe now to keep your Pro features and full history.',
  },
  {
    day: 14,
    title: 'Pro trial ends today',
    body: 'Your Pro trial ends today. Subscribe to keep unlimited access.',
  },
];

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Trial Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function scheduleTrialReminders(
  trialStartedAt: number,
): Promise<void> {
  await ensureChannel();
  await cancelTrialReminders();

  const now = Date.now();

  for (const reminder of REMINDERS) {
    const fireAt = trialStartedAt + reminder.day * 86_400_000;
    if (fireAt <= now) {
      continue;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireAt,
    };

    await notifee.createTriggerNotification(
      {
        id: `${REMINDER_TAG}_day${reminder.day}`,
        title: reminder.title,
        body: reminder.body,
        android: {
          channelId: CHANNEL_ID,
          smallIcon: 'ic_notification',
          tag: REMINDER_TAG,
        },
      },
      trigger,
    );
  }
}

export async function cancelTrialReminders(): Promise<void> {
  for (const reminder of REMINDERS) {
    try {
      await notifee.cancelNotification(`${REMINDER_TAG}_day${reminder.day}`);
    } catch {
      // Notification may not exist
    }
  }
}
