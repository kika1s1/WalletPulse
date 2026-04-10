import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import SubscriptionModel from '@data/database/models/SubscriptionModel';
import {Q} from '@nozbe/watermelondb';
import type {Subscription, CreateSubscriptionInput} from '@domain/entities/Subscription';
import {createSubscription} from '@domain/entities/Subscription';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {toDomain, type SubscriptionRaw} from '@data/mappers/subscription-mapper';
import {scheduleSubscriptionNotifications} from '@infrastructure/notification/subscription-notifications';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

function modelToDomain(model: SubscriptionModel): Subscription {
  const raw: SubscriptionRaw = {
    id: model.id,
    name: model.name,
    amount: model.amount,
    currency: model.currency,
    billingCycle: model.billingCycle,
    nextDueDate: model.nextDueDate,
    categoryId: model.categoryId,
    isActive: model.isActive,
    cancelledAt: model.cancelledAt,
    icon: model.icon,
    color: model.color,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  };
  return toDomain(raw);
}

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
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<SubscriptionModel>('subscriptions');
    const query = collection.query(Q.sortBy('next_due_date', Q.asc));

    if (!hasData.current) {setIsLoading(true);}
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setSubscriptions(models.map(modelToDomain));
        setIsLoading(false);
      },
      error: (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
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
  if (!subNotifEnabled) {return;}
  try {
    const ds = getLocalDataSource();
    const active = await ds.subscriptions.findActive();
    await scheduleSubscriptionNotifications(active);
  } catch {
    /* non-fatal */
  }
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
