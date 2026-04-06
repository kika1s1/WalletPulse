import {useState, useEffect, useCallback, useRef} from 'react';
import database from '@data/database';
import BillReminderModel from '@data/database/models/BillReminderModel';
import {Q} from '@nozbe/watermelondb';
import type {BillReminder, CreateBillReminderInput} from '@domain/entities/BillReminder';
import {createBillReminder} from '@domain/entities/BillReminder';
import {getLocalDataSource} from '@data/datasources/LocalDataSource';
import {toDomain, type BillReminderRaw} from '@data/mappers/bill-reminder-mapper';

function modelToDomain(model: BillReminderModel): BillReminder {
  const raw: BillReminderRaw = {
    id: model.id,
    name: model.name,
    amount: model.amount,
    currency: model.currency,
    dueDate: model.dueDate,
    recurrence: model.recurrence,
    categoryId: model.categoryId,
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
  markPaid: (id: string, paidTransactionId?: string) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
};

export function useBillReminderActions(): UseBillReminderActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveBill = useCallback(async (input: CreateBillReminderInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const bill = createBillReminder(input);
      await getLocalDataSource().billReminders.save(bill);
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
      await getLocalDataSource().billReminders.markPaid(id, paidTransactionId);
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {saveBill, markPaid, deleteBill, isSubmitting, error};
}
