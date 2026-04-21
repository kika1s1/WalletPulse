import type {NativeNotificationEvent} from '@infrastructure/native/NotificationBridge';
import {subscribeToNotifications} from '@infrastructure/native/NotificationBridge';
import {makeNotificationOrchestrator, type OrchestratorResult} from './orchestrator';
import {createDedupService, type DedupService} from './dedup-service';
import {getSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';

export type NotificationHandlerCallbacks = {
  onTransactionCreated?: (result: OrchestratorResult) => void;
  onDuplicate?: (result: OrchestratorResult) => void;
  onError?: (result: OrchestratorResult) => void;
};

let dedupInstance: DedupService | null = null;
let unsubscribe: (() => void) | null = null;

function getDedupService(): DedupService {
  if (!dedupInstance) {
    const ds = getSupabaseDataSource();
    dedupInstance = createDedupService(ds.transactions);
  }
  return dedupInstance;
}

export function startNotificationHandler(
  callbacks?: NotificationHandlerCallbacks,
): () => void {
  if (unsubscribe) {
    unsubscribe();
  }

  if (!isDataSourceReady()) {
    return () => {};
  }

  const ds = getSupabaseDataSource();
  const dedup = getDedupService();

  const orchestrator = makeNotificationOrchestrator({
    transactionRepo: ds.transactions,
    walletRepo: ds.wallets,
    notificationLogRepo: ds.notificationLogs,
    categoryRepo: ds.categories,
    dedupService: dedup,
    getDefaultWalletId: async () => {
      try {
        const wallets = await ds.wallets.findAll();
        const active = wallets.filter((w) => w.isActive);
        if (active.length === 0) {
          return null;
        }
        active.sort((a, b) => a.sortOrder - b.sortOrder);
        return active[0].id;
      } catch {
        return null;
      }
    },
  });

  const handleEvent = async (event: NativeNotificationEvent) => {
    const result = await orchestrator({
      packageName: event.packageName,
      title: event.title,
      body: event.body,
      receivedAt: event.receivedAt,
    });

    switch (result.status) {
      case 'created':
        callbacks?.onTransactionCreated?.(result);
        break;
      case 'duplicate':
        callbacks?.onDuplicate?.(result);
        break;
      case 'parse_failed':
      case 'no_parser':
      case 'no_wallet':
      case 'error':
        callbacks?.onError?.(result);
        break;
    }
  };

  unsubscribe = subscribeToNotifications(handleEvent);

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}

export function stopNotificationHandler(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function resetDedupCache(): void {
  dedupInstance?.clear();
  dedupInstance = null;
}
