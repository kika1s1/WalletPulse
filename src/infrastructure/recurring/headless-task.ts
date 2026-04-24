import {Platform} from 'react-native';
import {processRecurringItems} from './recurring-scheduler';
import {showRecurringChargeNotification} from '@infrastructure/notification/recurring-charge-notifications';
import {isDataSourceReady, getSupabaseDataSource} from '@data/datasources/SupabaseDataSource';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import type {RecurringChargeNotification} from './recurring-scheduler-core';

async function resolveWalletName(walletId: string): Promise<string> {
  try {
    if (!isDataSourceReady()) { return 'Wallet'; }
    const ds = getSupabaseDataSource();
    const wallet = await ds.wallets.findById(walletId);
    return wallet?.name ?? 'Wallet';
  } catch {
    return 'Wallet';
  }
}

/**
 * Entry point invoked by Android's WorkManager via a Headless JS task
 * (see android/app/.../recurring/RecurringWorker.kt). Runs the recurring
 * scheduler and emits a local notification per auto-posted transaction.
 *
 * Must return a Promise — Headless JS tears down the JS context once it
 * resolves.
 */
export default async function recurringHeadlessTask(): Promise<void> {
  if (Platform.OS !== 'android') { return; }

  const queue: RecurringChargeNotification[] = [];

  try {
    await processRecurringItems({
      emit: (n) => queue.push(n),
    });
  } catch {
    // The scheduler logs internally; swallow so WorkManager records
    // success and reschedules normally.
  }

  if (queue.length === 0) { return; }

  let notificationsEnabled = true;
  try {
    notificationsEnabled = useSettingsStore.getState().recurringChargeNotificationsEnabled;
  } catch {
    /* default to on */
  }
  if (!notificationsEnabled) { return; }

  for (const n of queue) {
    try {
      const walletName = await resolveWalletName(n.walletId);
      await showRecurringChargeNotification({...n, walletName});
    } catch {
      /* per-notification failure is non-fatal */
    }
  }
}
