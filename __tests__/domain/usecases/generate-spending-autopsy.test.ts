import {
  GenerateSpendingAutopsy,
  type AutopsyParams,
  type AutopsyTransaction,
} from '@domain/usecases/generate-spending-autopsy';

describe('GenerateSpendingAutopsy', () => {
  const autopsy = new GenerateSpendingAutopsy();
  const now = Date.now();

  const categories = [
    {id: 'food', name: 'Food'},
    {id: 'transport', name: 'Transport'},
    {id: 'shopping', name: 'Shopping'},
    {id: 'entertainment', name: 'Entertainment'},
  ];

  function expense(
    categoryId: string,
    amount: number,
    daysAgo = 0,
  ): AutopsyTransaction {
    return {
      amount,
      categoryId,
      transactionDate: now - daysAgo * 86_400_000,
      type: 'expense',
    };
  }

  const baseParams: AutopsyParams = {
    currentPeriodTransactions: [
      expense('food', 50_000),
      expense('transport', 20_000),
      expense('shopping', 80_000),
    ],
    previousPeriodTransactions: [
      expense('food', 40_000),
      expense('transport', 25_000),
      expense('shopping', 30_000),
    ],
    categories,
  };

  it('calculates total spent correctly', () => {
    const result = autopsy.execute(baseParams);
    expect(result.totalSpent).toBe(150_000);
  });

  it('identifies the top spending category', () => {
    const result = autopsy.execute(baseParams);
    expect(result.topCategory).toBe('Shopping');
  });

  it('identifies the biggest change category', () => {
    const result = autopsy.execute(baseParams);
    expect(result.biggestChange).toBe('Shopping');
  });

  it('calculates period comparison correctly', () => {
    const result = autopsy.execute(baseParams);
    expect(result.periodComparison.current).toBe(150_000);
    expect(result.periodComparison.previous).toBe(95_000);
    expect(result.periodComparison.changePercent).toBe(58);
  });

  it('detects category overspend', () => {
    const result = autopsy.execute(baseParams);
    const shoppingInsight = result.insights.find(
      (i) => i.type === 'overspend' && i.category === 'Shopping',
    );
    expect(shoppingInsight).toBeDefined();
    expect(shoppingInsight!.severity).toBe('critical');
    expect(shoppingInsight!.savingsEstimate).toBe(50_000);
  });

  it('detects positive savings', () => {
    const result = autopsy.execute(baseParams);
    const transportInsight = result.insights.find(
      (i) => i.type === 'positive' && i.category === 'Transport',
    );
    expect(transportInsight).toBeDefined();
    expect(transportInsight!.severity).toBe('info');
  });

  it('detects overall spending trend increase', () => {
    const result = autopsy.execute(baseParams);
    const trendInsight = result.insights.find((i) => i.type === 'trend');
    expect(trendInsight).toBeDefined();
    expect(trendInsight!.title).toContain('increased');
  });

  it('detects overall spending decrease', () => {
    const result = autopsy.execute({
      ...baseParams,
      currentPeriodTransactions: [expense('food', 30_000)],
      previousPeriodTransactions: [expense('food', 60_000)],
    });
    const positiveInsight = result.insights.find(
      (i) => i.type === 'positive' && i.title.includes('decreased'),
    );
    expect(positiveInsight).toBeDefined();
  });

  it('detects new spending categories', () => {
    const result = autopsy.execute({
      ...baseParams,
      currentPeriodTransactions: [
        ...baseParams.currentPeriodTransactions,
        expense('entertainment', 25_000),
      ],
    });
    const newCatInsight = result.insights.find(
      (i) =>
        i.type === 'savings_opportunity' &&
        i.category === 'Entertainment',
    );
    expect(newCatInsight).toBeDefined();
  });

  it('handles empty current transactions', () => {
    const result = autopsy.execute({
      ...baseParams,
      currentPeriodTransactions: [],
    });
    expect(result.totalSpent).toBe(0);
    expect(result.topCategory).toBe('None');
    expect(result.insights.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty previous transactions', () => {
    const result = autopsy.execute({
      ...baseParams,
      previousPeriodTransactions: [],
    });
    expect(result.periodComparison.previous).toBe(0);
    expect(result.periodComparison.changePercent).toBe(100);
  });

  it('handles both periods empty', () => {
    const result = autopsy.execute({
      currentPeriodTransactions: [],
      previousPeriodTransactions: [],
      categories,
    });
    expect(result.totalSpent).toBe(0);
    expect(result.topCategory).toBe('None');
    expect(result.biggestChange).toBe('None');
    expect(result.periodComparison.changePercent).toBe(0);
  });

  it('ignores income transactions in spending totals', () => {
    const result = autopsy.execute({
      ...baseParams,
      currentPeriodTransactions: [
        expense('food', 50_000),
        {
          amount: 500_000,
          categoryId: 'salary',
          transactionDate: now,
          type: 'income',
        },
      ],
    });
    expect(result.totalSpent).toBe(50_000);
  });

  it('limits overspend insights to top 3', () => {
    const current = [
      expense('food', 100_000),
      expense('transport', 80_000),
      expense('shopping', 70_000),
      expense('entertainment', 60_000),
    ];
    const previous = [
      expense('food', 10_000),
      expense('transport', 10_000),
      expense('shopping', 10_000),
      expense('entertainment', 10_000),
    ];
    const result = autopsy.execute({
      currentPeriodTransactions: current,
      previousPeriodTransactions: previous,
      categories,
    });
    const overspends = result.insights.filter(
      (i) => i.type === 'overspend',
    );
    expect(overspends.length).toBeLessThanOrEqual(3);
  });
});
