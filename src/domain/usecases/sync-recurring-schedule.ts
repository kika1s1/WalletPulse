import type {Transaction} from '@domain/entities/Transaction';
import type {IRecurringScheduleRepository} from '@domain/repositories/IRecurringScheduleRepository';
import {
  createRecurringSchedule,
  recurrenceRuleToCadence,
  type RecurringSchedule,
} from '@domain/entities/RecurringSchedule';
import {advanceNextDueDate} from '@shared/utils/advance-next-due-date';

type Deps = {
  recurringSchedules: IRecurringScheduleRepository;
  now: () => number;
  generateId: () => string;
};

/**
 * Syncs the recurring-schedule sidecar row for a transaction the user
 * just created or edited.
 *
 * - If the user toggled `isRecurring` ON with a known `recurrenceRule`
 *   and the transaction is income/expense, an active schedule is upserted.
 *   The transaction the user entered counts as occurrence #1, so
 *   `nextDueDate` is one cadence step *after* `transaction.transactionDate`.
 * - If the user toggled it OFF, any existing schedule is deactivated
 *   (soft-off — preserves the back-pointer for re-toggling).
 *
 * Transfers are ignored — the form already hides the toggle for transfers.
 */
export function makeSyncRecurringSchedule(deps: Deps) {
  return async function sync(transaction: Transaction): Promise<void> {
    if (transaction.type === 'transfer') {
      return;
    }

    const existing = await deps.recurringSchedules.findByTemplateTransactionId(transaction.id);
    const wantsRecurring = transaction.isRecurring && transaction.recurrenceRule.trim() !== '';

    if (!wantsRecurring) {
      if (existing && existing.isActive) {
        await deps.recurringSchedules.deactivate(existing.id, deps.now());
      }
      return;
    }

    const cadence = recurrenceRuleToCadence(transaction.recurrenceRule);
    if (!cadence) {
      // Unknown rule — silently ignore rather than throwing on save. The
      // form constrains rules to known values, so this only fires for
      // legacy or imported data.
      return;
    }

    const nowMs = deps.now();
    const nextDueDate = advanceNextDueDate(transaction.transactionDate, cadence);

    if (existing) {
      const updated: RecurringSchedule = {
        ...existing,
        walletId: transaction.walletId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        merchant: transaction.merchant,
        description: transaction.description,
        tags: [...transaction.tags],
        cadence,
        nextDueDate,
        isActive: true,
        updatedAt: nowMs,
      };
      await deps.recurringSchedules.update(updated);
      return;
    }

    const fresh = createRecurringSchedule({
      id: deps.generateId(),
      templateTransactionId: transaction.id,
      walletId: transaction.walletId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      merchant: transaction.merchant,
      description: transaction.description,
      tags: [...transaction.tags],
      cadence,
      nextDueDate,
      isActive: true,
      createdAt: nowMs,
      updatedAt: nowMs,
    });
    await deps.recurringSchedules.save(fresh);
  };
}
