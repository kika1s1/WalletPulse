import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {generateId} from '@shared/utils/hash';
import {
  processRecurringItemsWithDeps,
  type RecurringChargeNotification,
} from './recurring-scheduler-core';

export type {
  RecurringSchedulerDeps,
  RecurringChargeNotification,
} from './recurring-scheduler-core';
export {processRecurringItemsWithDeps} from './recurring-scheduler-core';

export type ProcessRecurringOptions = {
  emit?: (n: RecurringChargeNotification) => void;
};

export async function processRecurringItems(options: ProcessRecurringOptions = {}): Promise<void> {
  if (!isDataSourceReady()) { return; }
  const ds = getSupabaseDataSource();
  const createTransaction = makeCreateTransaction({
    transactionRepo: ds.transactions,
    walletRepo: ds.wallets,
  });
  await processRecurringItemsWithDeps({
    createTransaction,
    subscriptions: ds.subscriptions,
    billReminders: ds.billReminders,
    recurringSchedules: ds.recurringSchedules,
    wallets: ds.wallets,
    now: () => Date.now(),
    generateId,
    emit: options.emit,
  });
}
