import {
  getUpcomingBills,
  getOverdueBills,
  groupBillsByMonth,
  calculateMonthlyBillTotal,
  getNextDueDate,
} from '@domain/usecases/bill-reminder-management';
import type {BillReminder} from '@domain/entities/BillReminder';

const DAY = 86400000;
const now = Date.now();

function makeBill(overrides: Partial<BillReminder> = {}): BillReminder {
  return {
    id: 'bill-1',
    name: 'Electricity',
    amount: 15000,
    currency: 'USD',
    dueDate: now + 5 * DAY,
    recurrence: 'monthly',
    categoryId: 'utilities',
    isPaid: false,
    remindDaysBefore: 3,
    createdAt: now - 30 * DAY,
    updatedAt: now,
    ...overrides,
  };
}

describe('bill-reminder-management', () => {
  describe('getUpcomingBills', () => {
    it('returns unpaid bills due within the given window', () => {
      const bills = [
        makeBill({id: 'b1', dueDate: now + 3 * DAY}),
        makeBill({id: 'b2', dueDate: now + 20 * DAY}),
        makeBill({id: 'b3', dueDate: now - 1 * DAY, isPaid: true}),
      ];
      const upcoming = getUpcomingBills(bills, now, 7);
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].id).toBe('b1');
    });

    it('excludes paid bills', () => {
      const bills = [makeBill({isPaid: true, dueDate: now + 2 * DAY})];
      expect(getUpcomingBills(bills, now, 7)).toHaveLength(0);
    });

    it('sorts by due date ascending', () => {
      const bills = [
        makeBill({id: 'b2', dueDate: now + 5 * DAY}),
        makeBill({id: 'b1', dueDate: now + 1 * DAY}),
      ];
      const upcoming = getUpcomingBills(bills, now, 7);
      expect(upcoming[0].id).toBe('b1');
      expect(upcoming[1].id).toBe('b2');
    });
  });

  describe('getOverdueBills', () => {
    it('returns unpaid bills past due date', () => {
      const bills = [
        makeBill({id: 'overdue', dueDate: now - 2 * DAY}),
        makeBill({id: 'future', dueDate: now + 5 * DAY}),
        makeBill({id: 'paid', dueDate: now - 3 * DAY, isPaid: true}),
      ];
      const overdue = getOverdueBills(bills, now);
      expect(overdue.length).toBe(1);
      expect(overdue[0].id).toBe('overdue');
    });
  });

  describe('groupBillsByMonth', () => {
    it('groups bills into month buckets', () => {
      const jan = new Date('2025-01-15').getTime();
      const feb = new Date('2025-02-10').getTime();
      const bills = [
        makeBill({id: 'b1', dueDate: jan}),
        makeBill({id: 'b2', dueDate: jan + 5 * DAY}),
        makeBill({id: 'b3', dueDate: feb}),
      ];
      const groups = groupBillsByMonth(bills);
      expect(Object.keys(groups).length).toBe(2);
    });
  });

  describe('calculateMonthlyBillTotal', () => {
    it('sums amounts of monthly-equivalent bills', () => {
      const bills = [
        makeBill({amount: 10000, recurrence: 'monthly'}),
        makeBill({amount: 5200, recurrence: 'weekly'}),
      ];
      const total = calculateMonthlyBillTotal(bills);
      expect(total).toBeGreaterThan(10000);
    });

    it('handles quarterly and yearly recurrence', () => {
      const bills = [
        makeBill({amount: 120000, recurrence: 'yearly'}),
        makeBill({amount: 30000, recurrence: 'quarterly'}),
      ];
      const total = calculateMonthlyBillTotal(bills);
      expect(total).toBe(10000 + 10000);
    });

    it('treats once as full amount', () => {
      const bills = [makeBill({amount: 5000, recurrence: 'once'})];
      const total = calculateMonthlyBillTotal(bills);
      expect(total).toBe(5000);
    });
  });

  describe('getNextDueDate', () => {
    it('returns next due date for monthly recurrence', () => {
      const base = new Date('2025-01-15').getTime();
      const next = getNextDueDate(base, 'monthly');
      const nextDate = new Date(next);
      expect(nextDate.getMonth()).toBe(1);
      expect(nextDate.getDate()).toBe(15);
    });

    it('returns same date for once recurrence', () => {
      const base = new Date('2025-06-01').getTime();
      expect(getNextDueDate(base, 'once')).toBe(base);
    });
  });
});
