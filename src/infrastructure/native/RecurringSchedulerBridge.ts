import {NativeModules, Platform} from 'react-native';

const {RecurringSchedulerBridge} = NativeModules;

/**
 * Schedule the periodic WorkManager job that runs the recurring scheduler
 * in a Headless JS task. WorkManager clamps the interval to a 15-minute
 * minimum; smaller values are silently raised by the framework.
 *
 * Idempotent: backed by ExistingPeriodicWorkPolicy.KEEP, so calling this
 * on every cold start is safe.
 */
export async function enqueueRecurringPeriodic(intervalMinutes: number): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (!RecurringSchedulerBridge) {
    return false;
  }
  try {
    return await RecurringSchedulerBridge.enqueuePeriodic(intervalMinutes);
  } catch {
    return false;
  }
}

export async function cancelRecurringPeriodic(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (!RecurringSchedulerBridge) {
    return false;
  }
  try {
    return await RecurringSchedulerBridge.cancel();
  } catch {
    return false;
  }
}
