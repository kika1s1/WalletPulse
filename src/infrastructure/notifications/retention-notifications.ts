import notifee, {AndroidImportance} from '@notifee/react-native';

const CHANNEL_ID = 'walletpulse_retention';

type RetentionType = 'inactive_user' | 'monthly_report' | 'budget_update';

type RetentionData = {
  transactionCount?: number;
  month?: string;
  budgetName?: string;
  remainingFormatted?: string;
};

const TEMPLATES: Record<RetentionType, (data: RetentionData) => {title: string; body: string}> = {
  inactive_user: (data) => ({
    title: 'Your wallet misses you',
    body: `Your wallet tracked ${data.transactionCount ?? 0} transactions. Take a look.`,
  }),
  monthly_report: (data) => ({
    title: 'Monthly report ready',
    body: `Your ${data.month ?? 'monthly'} Spending Autopsy is ready. See your insights.`,
  }),
  budget_update: (data) => ({
    title: 'Budget update',
    body: `You have ${data.remainingFormatted ?? '$0'} left in your ${data.budgetName ?? 'budget'}.`,
  }),
};

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Reminders',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function scheduleRetentionNotification(
  type: RetentionType,
  data: RetentionData,
): Promise<void> {
  await ensureChannel();

  const {title, body} = TEMPLATES[type](data);

  await notifee.displayNotification({
    id: `retention_${type}`,
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification',
    },
  });
}
