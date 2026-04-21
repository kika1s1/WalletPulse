import {
  computeBalanceHistory,
  type BalanceHistoryTransaction,
} from '@domain/usecases/calculate-balance-history';

function tx(
  overrides: Partial<BalanceHistoryTransaction> & {amount: number; type: BalanceHistoryTransaction['type']},
): BalanceHistoryTransaction {
  return {
    id: 'tx-' + Math.random().toString(36).slice(2, 8),
    amount: overrides.amount,
    type: overrides.type,
    notes: overrides.notes ?? '',
    transactionDate: overrides.transactionDate ?? Date.now(),
    currency: overrides.currency ?? 'USD',
  };
}

const DAY = 86_400_000;
const BASE = new Date(2025, 0, 1).getTime();

describe('computeBalanceHistory', () => {
  it('returns empty array for no transactions', () => {
    const result = computeBalanceHistory([], 'USD', {});
    expect(result).toEqual([]);
  });

  it('computes running balance from income and expense', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 100_00, type: 'income', transactionDate: BASE}),
      tx({amount: 30_00, type: 'expense', transactionDate: BASE}),
      tx({amount: 50_00, type: 'income', transactionDate: BASE + DAY}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result.length).toBe(2);
    expect(result[0].balance).toBe(70_00);
    expect(result[1].balance).toBe(120_00);
  });

  it('fills gaps between days with carried-forward balance', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 100_00, type: 'income', transactionDate: BASE}),
      tx({amount: 20_00, type: 'expense', transactionDate: BASE + 3 * DAY}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result.length).toBe(4);
    expect(result[0].balance).toBe(100_00);
    expect(result[1].balance).toBe(100_00);
    expect(result[2].balance).toBe(100_00);
    expect(result[3].balance).toBe(80_00);
  });

  it('handles transfers correctly (source deducts, destination adds)', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 200_00, type: 'income', transactionDate: BASE}),
      tx({amount: 50_00, type: 'transfer', notes: '[WP_XFER:peer=tx2:leg=source]', transactionDate: BASE}),
      tx({amount: 50_00, type: 'transfer', notes: '[WP_XFER:peer=tx1:leg=destination]', transactionDate: BASE}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result[0].balance).toBe(200_00);
  });

  it('converts multi-currency amounts using provided rates', () => {
    const rates = {EUR: 1.1};
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 100_00, type: 'income', currency: 'EUR', transactionDate: BASE}),
      tx({amount: 50_00, type: 'expense', currency: 'USD', transactionDate: BASE}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', rates);

    expect(result[0].balance).toBe(110_00 - 50_00);
  });

  it('includes dateMs and dateLabel in each point', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 100_00, type: 'income', transactionDate: BASE}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result[0]).toHaveProperty('dateMs');
    expect(result[0]).toHaveProperty('dateLabel');
    expect(typeof result[0].dateLabel).toBe('string');
    expect(result[0].dateLabel.length).toBeGreaterThan(0);
  });

  it('tracks highWater and lowWater correctly', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 500_00, type: 'income', transactionDate: BASE}),
      tx({amount: 100_00, type: 'expense', transactionDate: BASE + DAY}),
      tx({amount: 300_00, type: 'expense', transactionDate: BASE + 2 * DAY}),
      tx({amount: 200_00, type: 'income', transactionDate: BASE + 3 * DAY}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});
    const balances = result.map((p) => p.balance);

    expect(Math.max(...balances)).toBe(500_00);
    expect(Math.min(...balances)).toBe(100_00);
  });

  it('handles single-day data', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 42_00, type: 'income', transactionDate: BASE}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result.length).toBe(1);
    expect(result[0].balance).toBe(42_00);
  });

  it('supports negative balance (more expenses than income)', () => {
    const transactions: BalanceHistoryTransaction[] = [
      tx({amount: 10_00, type: 'income', transactionDate: BASE}),
      tx({amount: 50_00, type: 'expense', transactionDate: BASE}),
    ];

    const result = computeBalanceHistory(transactions, 'USD', {});

    expect(result[0].balance).toBe(-40_00);
  });

  describe('periodStartMs + openingBalanceCents (period window)', () => {
    it('starts the timeline at periodStartMs with the opening balance', () => {
      const periodStart = BASE + 2 * DAY;
      const transactions: BalanceHistoryTransaction[] = [
        tx({amount: 100_00, type: 'income', transactionDate: BASE}),
        tx({amount: 30_00, type: 'expense', transactionDate: BASE + DAY}),
        tx({amount: 20_00, type: 'income', transactionDate: BASE + 3 * DAY}),
      ];

      const result = computeBalanceHistory(transactions, 'USD', {}, {
        periodStartMs: periodStart,
        periodEndMs: BASE + 4 * DAY,
        openingBalanceCents: 70_00,
      });

      expect(result[0].dateMs).toBe(periodStart);
      expect(result[0].balance).toBe(70_00);
      expect(result[result.length - 1].balance).toBe(90_00);
    });

    it('ignores transactions before periodStartMs in the daily deltas', () => {
      const periodStart = BASE + 2 * DAY;
      const transactions: BalanceHistoryTransaction[] = [
        tx({amount: 500_00, type: 'income', transactionDate: BASE}),
        tx({amount: 100_00, type: 'expense', transactionDate: BASE + 3 * DAY}),
      ];

      const result = computeBalanceHistory(transactions, 'USD', {}, {
        periodStartMs: periodStart,
        periodEndMs: BASE + 4 * DAY,
        openingBalanceCents: 500_00,
      });

      expect(result[0].balance).toBe(500_00);
      expect(result[1].balance).toBe(400_00);
      expect(result[2].balance).toBe(400_00);
    });

    it('returns a flat line at opening balance when no in-period transactions exist', () => {
      const periodStart = BASE + 5 * DAY;
      const transactions: BalanceHistoryTransaction[] = [
        tx({amount: 200_00, type: 'income', transactionDate: BASE}),
      ];

      const result = computeBalanceHistory(transactions, 'USD', {}, {
        periodStartMs: periodStart,
        periodEndMs: periodStart + 2 * DAY,
        openingBalanceCents: 200_00,
      });

      expect(result.length).toBe(3);
      expect(result.every((p) => p.balance === 200_00)).toBe(true);
    });

    it('carries a zero opening balance forward when omitted', () => {
      const periodStart = BASE + 1 * DAY;
      const transactions: BalanceHistoryTransaction[] = [
        tx({amount: 10_00, type: 'income', transactionDate: BASE + 2 * DAY}),
      ];

      const result = computeBalanceHistory(transactions, 'USD', {}, {
        periodStartMs: periodStart,
        periodEndMs: BASE + 2 * DAY,
      });

      expect(result[0].balance).toBe(0);
      expect(result[result.length - 1].balance).toBe(10_00);
    });

    it('transfer legs in the same currency net to zero across the window', () => {
      const periodStart = BASE;
      const transactions: BalanceHistoryTransaction[] = [
        tx({amount: 500_00, type: 'income', transactionDate: BASE}),
        tx({amount: 50_00, type: 'transfer', notes: '[WP_XFER:peer=tx2:leg=source]', transactionDate: BASE + DAY}),
        tx({amount: 50_00, type: 'transfer', notes: '[WP_XFER:peer=tx1:leg=destination]', transactionDate: BASE + DAY}),
      ];

      const result = computeBalanceHistory(transactions, 'USD', {}, {
        periodStartMs: periodStart,
        periodEndMs: BASE + DAY,
        openingBalanceCents: 0,
      });

      expect(result[result.length - 1].balance).toBe(500_00);
    });
  });
});
