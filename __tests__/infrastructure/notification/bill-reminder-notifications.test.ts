import type {BillReminder} from '@domain/entities/BillReminder';
import {computeBillNotifications} from '@infrastructure/notification/bill-reminder-notifications';

const MS_PER_DAY = 86_400_000;

function makeBill(overrides: Partial<BillReminder> = {}): BillReminder {
  return {
    id: 'bill-1',
    name: 'Rent',
    amount: 120000,
    currency: 'USD',
    dueDate: Date.now() + 7 * MS_PER_DAY,
    recurrence: 'monthly',
    categoryId: 'cat-housing',
    walletId: 'wallet-1',
    isPaid: false,
    remindDaysBefore: 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('computeBillNotifications', () => {
  const NOW = Date.now();

  it('returns a notification for an unpaid bill within remind window', () => {
    const bill = makeBill({
      dueDate: NOW + 7 * MS_PER_DAY,
      remindDaysBefore: 3,
    });

    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].billId).toBe('bill-1');
    expect(result[0].billName).toBe('Rent');
    expect(result[0].triggerMs).toBeGreaterThanOrEqual(NOW);
  });

  it('skips paid bills', () => {
    const bill = makeBill({isPaid: true});
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(0);
  });

  it('skips bills with remindDaysBefore = 0', () => {
    const bill = makeBill({remindDaysBefore: 0});
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(0);
  });

  it('skips bills whose trigger time is more than 1 day in the past', () => {
    const bill = makeBill({
      dueDate: NOW - 5 * MS_PER_DAY,
      remindDaysBefore: 3,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(0);
  });

  it('clamps trigger to at least now + 5s for bills whose remind time just passed', () => {
    const bill = makeBill({
      dueDate: NOW + 2.5 * MS_PER_DAY,
      remindDaysBefore: 3,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].triggerMs).toBeGreaterThanOrEqual(NOW + 5000);
  });

  it('handles multiple bills and returns correct payloads', () => {
    const bill1 = makeBill({
      id: 'bill-1',
      name: 'Rent',
      dueDate: NOW + 5 * MS_PER_DAY,
      remindDaysBefore: 3,
    });
    const bill2 = makeBill({
      id: 'bill-2',
      name: 'Internet',
      dueDate: NOW + 10 * MS_PER_DAY,
      remindDaysBefore: 5,
    });
    const bill3 = makeBill({
      id: 'bill-3',
      name: 'Netflix',
      isPaid: true,
      dueDate: NOW + 2 * MS_PER_DAY,
      remindDaysBefore: 1,
    });

    const result = computeBillNotifications([bill1, bill2, bill3], NOW);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.billId)).toEqual(['bill-1', 'bill-2']);
  });

  it('formats amount correctly in payload', () => {
    const bill = makeBill({
      amount: 150050,
      currency: 'USD',
      dueDate: NOW + 5 * MS_PER_DAY,
      remindDaysBefore: 3,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toContain('1,500.50');
  });

  it('includes "due today" label when trigger is on due date', () => {
    const bill = makeBill({
      dueDate: NOW + 100,
      remindDaysBefore: 1,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].dueLabel).toBe('due today');
  });

  it('includes "due tomorrow" label for 1 day away', () => {
    const bill = makeBill({
      dueDate: NOW + MS_PER_DAY / 2,
      remindDaysBefore: 1,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].dueLabel).toBe('due tomorrow');
  });

  it('includes "due in N days" label for further out dates', () => {
    const bill = makeBill({
      dueDate: NOW + 10 * MS_PER_DAY,
      remindDaysBefore: 7,
    });
    const result = computeBillNotifications([bill], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].dueLabel).toMatch(/^due in \d+ days$/);
  });
});
