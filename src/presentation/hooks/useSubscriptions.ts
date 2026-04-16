import {useState, useEffect, useCallback} from 'react';
import type {Subscription, CreateSubscriptionInput} from '@domain/entities/Subscription';
import {createSubscription} from '@domain/entities/Subscription';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {scheduleSubscriptionNotifications} from '@infrastructure/notification/subscription-notifications';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

export type UseSubscriptionsReturn = {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useSubscriptions(): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ds = getLocalDataSource();
        const data = await ds.subscriptions.findAll();
        if (!cancelled) {
          setSubscriptions(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [refetchKey]);

  return {subscriptions, isLoading, error, refetch};
}

export type UseSubscriptionActionsReturn = {
  saveSubscription: (input: CreateSubscriptionInput) => Promise<void>;
  updateSubscription: (input: CreateSubscriptionInput) => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

async function rescheduleSubscriptionNotifications(): Promise<void> {
  const subNotifEnabled = useSettingsStore.getState().subscriptionNotificationsEnabled;
  if (!subNotifEnabled) { return; }
  try {
    const ds = getLocalDataSource();
    const active = await ds.subscriptions.findActive();
    await scheduleSubscriptionNotifications(active);
  } catch { /* non-fatal */ }
}

export function useSubscriptionActions(): UseSubscriptionActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSubscription = useCallback(async (input: CreateSubscriptionInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const sub = createSubscription(input);
      await getLocalDataSource().subscriptions.save(sub);
      await rescheduleSubscriptionNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateSubscription = useCallback(async (input: CreateSubscriptionInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const sub = createSubscription(input);
      await getLocalDataSource().subscriptions.update(sub);
      await rescheduleSubscriptionNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().subscriptions.cancel(id, Date.now());
      await rescheduleSubscriptionNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const deleteSubscription = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().subscriptions.delete(id);
      await rescheduleSubscriptionNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {saveSubscription, updateSubscription, cancelSubscription, deleteSubscription, isSubmitting, error};
}
