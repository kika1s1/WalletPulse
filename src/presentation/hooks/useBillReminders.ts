import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import BillReminderModel from '@data/database/models/BillReminderModel';
import {Q} from '@nozbe/watermelondb';
import type {BillReminder, CreateBillReminderInput} from '@domain/entities/BillReminder';
import {createBillReminder} from '@domain/entities/BillReminder';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {toDomain, type BillReminderRaw} from '@data/mappers/bill-reminder-mapper';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {generateId} from '@shared/utils/hash';
import {scheduleBillNotifications} from '@infrastructure/notification/bill-reminder-notifications';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

function modelToDomain(model: BillReminderModel): BillReminder {
  const raw: BillReminderRaw = {
    id: model.id,
    name: model.name,
    amount: model.amount,
    currency: model.currency,
    dueDate: model.dueDate,
    recurrence: model.recurrence,
    categoryId: model.categoryId,
    walletId: model.walletId ?? '',
    isPaid: model.isPaid,
    paidTransactionId: model.paidTransactionId,
    remindDaysBefore: model.remindDaysBefore,
    createdAt: model.createdAt?.getTime() ?? Date.now(),
    updatedAt: model.updatedAt?.getTime() ?? Date.now(),
  };
  return toDomain(raw);
}

export type UseBillRemindersReturn = {
  bills: BillReminder[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useBillReminders(): UseBillRemindersReturn {
  const [bills, setBills] = useState<BillReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const hasData = useRef(false);

  const refetch = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const collection = database.get<BillReminderModel>('bill_reminders');
    const query = collection.query(Q.sortBy('due_date', Q.asc));

    if (!hasData.current) setIsLoading(true);
    setError(null);

    const subscription = query.observe().subscribe({
      next: (models) => {
        hasData.current = true;
        setBills(models.map(modelToDomain));
        setIsLoading(false);
      },
      error: (err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refetchKey]);

  return {bills, isLoading, error, refetch};
}

export type UseBillReminderActionsReturn = {
  saveBill: (input: CreateBillReminderInput) => Promise<void>;
  updateBill: (input: CreateBillReminderInput) => Promise<void>;
  markPaid: (id: string, paidTransactionId?: string) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

async function refreshBillNotifications(): Promise<void> {
  const enabled = useSettingsStore.getState().billReminderNotificationsEnabled;
  if (!enabled) return;
  try {
    const ds = getLocalDataSource();
    const unpaid = await ds.billReminders.findUnpaid();
    await scheduleBillNotifications(unpaid);
  } catch {
    /* non-fatal */
  }
}

export function useBillReminderActions(): UseBillReminderActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveBill = useCallback(async (input: CreateBillReminderInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const bill = createBillReminder(input);
      await getLocalDataSource().billReminders.save(bill);
      void refreshBillNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateBill = useCallback(async (input: CreateBillReminderInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const bill = createBillReminder(input);
      await getLocalDataSource().billReminders.update(bill);
      void refreshBillNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const markPaid = useCallback(async (id: string, paidTransactionId?: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (paidTransactionId) {
        await getLocalDataSource().billReminders.markPaid(id, paidTransactionId);
      } else {
        const ds = getLocalDataSource();
        const bill = await ds.billReminders.findById(id);
        if (!bill) {
          throw new Error('Bill reminder not found');
        }

        const walletId = bill.walletId;
        if (!walletId) {
          throw new Error('No wallet assigned to this bill. Edit the bill and assign a wallet first.');
        }

        const createTxn = makeCreateTransaction({
          transactionRepo: ds.transactions,
          walletRepo: ds.wallets,
        });
        const now = Date.now();
        const txnId = generateId();
        await createTxn({
          id: txnId,
          walletId,
          categoryId: bill.categoryId,
          amount: bill.amount,
          currency: bill.currency,
          type: 'expense',
          description: `Bill payment: ${bill.name}`,
          merchant: bill.name,
          source: 'manual',
          sourceHash: '',
          transactionDate: now,
          createdAt: now,
          updatedAt: now,
        });
        await ds.billReminders.markPaid(id, txnId);
      }
      void refreshBillNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const deleteBill = useCallback(async (id: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await getLocalDataSource().billReminders.delete(id);
      void refreshBillNotifications();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {saveBill, updateBill, markPaid, deleteBill, isSubmitting, error};
}
