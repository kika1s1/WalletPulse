import {
  createBillReminder,
  isOverdue,
  isPaidWithTransaction,
  shouldRemind,
} from '@domain/entities/BillReminder';

const MS_PER_DAY = 86_400_000;

const baseInput = {
  id: 'bill-1',
  name: 'Rent',
  amount: 120000,
  currency: 'USD',
  dueDate: Date.UTC(2026, 5, 15),
  recurrence: 'monthly' as const,
  categoryId: 'cat-housing',
  isPaid: false,
  remindDaysBefore: 7,
  createdAt: 1,
  updatedAt: 1,
};

describe('BillReminder entity', () => {
  describe('createBillReminder', () => {
    it('creates a valid monthly bill', () => {
      const b = createBillReminder(baseInput);
      expect(b.name).toBe('Rent');
      expect(b.recurrence).toBe('monthly');
      expect(b.amount).toBe(120000);
    });

    it('rejects an empty name', () => {
      expect(() => createBillReminder({...baseInput, name: ''})).toThrow('Name must not be empty');
    });
  });

  describe('isOverdue', () => {
    it('returns true when past due and unpaid', () => {
      const due = Date.UTC(2026, 1, 1);
      const now = Date.UTC(2026, 2, 1);
      const b = createBillReminder({...baseInput, dueDate: due, isPaid: false});
      expect(isOverdue(b, now)).toBe(true);
    });

    it('returns false when paid even if date passed', () => {
      const due = Date.UTC(2026, 1, 1);
      const now = Date.UTC(2026, 2, 1);
      const b = createBillReminder({...baseInput, dueDate: due, isPaid: true});
      expect(isOverdue(b, now)).toBe(false);
    });
  });

  describe('shouldRemind', () => {
    it('returns true when approaching due date inside remind window', () => {
      const dueDate = Date.UTC(2026, 4, 10);
      const now = Date.UTC(2026, 4, 8);
      const b = createBillReminder({...baseInput, dueDate, remindDaysBefore: 7, isPaid: false});
      expect(shouldRemind(b, now)).toBe(true);
    });

    it('returns false when before remind window', () => {
      const dueDate = Date.UTC(2026, 4, 20);
      const now = Date.UTC(2026, 4, 10);
      const b = createBillReminder({...baseInput, dueDate, remindDaysBefore: 3, isPaid: false});
      expect(shouldRemind(b, now)).toBe(false);
    });
  });

  describe('isPaidWithTransaction', () => {
    it('returns true when paid and linked to a transaction', () => {
      const b = createBillReminder({
        ...baseInput,
        isPaid: true,
        paidTransactionId: 'txn-abc',
      });
      expect(isPaidWithTransaction(b)).toBe(true);
    });

    it('returns false when paid but no transaction id', () => {
      const b = createBillReminder({...baseInput, isPaid: true});
      expect(isPaidWithTransaction(b)).toBe(false);
    });
  });
});
