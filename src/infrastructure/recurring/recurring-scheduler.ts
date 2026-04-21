import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {generateId} from '@shared/utils/hash';
import {processRecurringItemsWithDeps} from './recurring-scheduler-core';

export type {RecurringSchedulerDeps} from './recurring-scheduler-core';
export {processRecurringItemsWithDeps} from './recurring-scheduler-core';

export async function processRecurringItems(): Promise<void> {
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
    wallets: ds.wallets,
    now: () => Date.now(),
    generateId,
  });
}
