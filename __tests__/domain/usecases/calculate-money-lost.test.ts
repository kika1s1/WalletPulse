import {
  CalculateMoneyLost,
  type MoneyLostTransaction,
} from '@domain/usecases/calculate-money-lost';

describe('CalculateMoneyLost', () => {
  const calc = new CalculateMoneyLost();
  const jan15 = new Date('2026-01-15').getTime();
  const feb10 = new Date('2026-02-10').getTime();
  const feb20 = new Date('2026-02-20').getTime();

  const sampleTransactions: MoneyLostTransaction[] = [
    {
      date: jan15,
      amount: 100_000,
      currency: 'USD',
      appliedRate: 0.95,
      midMarketRate: 1.0,
      source: 'Payoneer',
    },
    {
      date: feb10,
      amount: 200_000,
      currency: 'USD',
      appliedRate: 0.92,
      midMarketRate: 1.0,
      source: 'Payoneer',
    },
    {
      date: feb20,
      amount: 50_000,
      currency: 'USD',
      appliedRate: 0.98,
      midMarketRate: 1.0,
      source: 'Grey',
    },
  ];

  it('calculates total loss from rate differences', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    const expectedLoss =
      Math.round(100_000 * (1.0 - 0.95)) +
      Math.round(200_000 * (1.0 - 0.92)) +
      Math.round(50_000 * (1.0 - 0.98));

    expect(result.totalLost).toBe(expectedLoss);
    expect(result.currency).toBe('USD');
    expect(result.transactionCount).toBe(3);
  });

  it('identifies the worst transaction', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    expect(result.worstTransaction).not.toBeNull();
    expect(result.worstTransaction!.source).toBe('Payoneer');
    expect(result.worstTransaction!.date).toBe(feb10);
    expect(result.worstTransaction!.lostAmount).toBe(
      Math.round(200_000 * (1.0 - 0.92)),
    );
  });

  it('aggregates by source correctly', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    expect(result.bySource).toHaveLength(2);
    const payoneer = result.bySource.find((s) => s.source === 'Payoneer');
    const grey = result.bySource.find((s) => s.source === 'Grey');

    expect(payoneer).toBeDefined();
    expect(payoneer!.count).toBe(2);
    expect(grey).toBeDefined();
    expect(grey!.count).toBe(1);
  });

  it('aggregates by month correctly', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    expect(result.byMonth).toHaveLength(2);
    expect(result.byMonth[0].month).toBe('2026-01');
    expect(result.byMonth[1].month).toBe('2026-02');
  });

  it('handles zero loss transactions', () => {
    const zeroLoss: MoneyLostTransaction[] = [
      {
        date: jan15,
        amount: 100_000,
        currency: 'USD',
        appliedRate: 1.0,
        midMarketRate: 1.0,
        source: 'Wise',
      },
    ];

    const result = calc.execute({
      transactions: zeroLoss,
      targetCurrency: 'USD',
    });

    expect(result.totalLost).toBe(0);
    expect(result.averageLossPerTransaction).toBe(0);
  });

  it('handles empty transactions', () => {
    const result = calc.execute({
      transactions: [],
      targetCurrency: 'ETB',
    });

    expect(result.totalLost).toBe(0);
    expect(result.transactionCount).toBe(0);
    expect(result.worstTransaction).toBeNull();
    expect(result.bySource).toHaveLength(0);
    expect(result.byMonth).toHaveLength(0);
    expect(result.currency).toBe('ETB');
  });

  it('calculates average loss per transaction', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    expect(result.averageLossPerTransaction).toBe(
      Math.round(result.totalLost / 3),
    );
  });

  it('provides a savings tip', () => {
    const result = calc.execute({
      transactions: sampleTransactions,
      targetCurrency: 'USD',
    });

    expect(result.savingsTip.length).toBeGreaterThan(0);
    expect(result.savingsTip).toContain('Payoneer');
  });

  it('never returns negative loss', () => {
    const betterRate: MoneyLostTransaction[] = [
      {
        date: jan15,
        amount: 100_000,
        currency: 'USD',
        appliedRate: 1.05,
        midMarketRate: 1.0,
        source: 'Lucky',
      },
    ];

    const result = calc.execute({
      transactions: betterRate,
      targetCurrency: 'USD',
    });

    expect(result.totalLost).toBe(0);
  });
});
