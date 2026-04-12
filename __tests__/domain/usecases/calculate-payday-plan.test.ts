import {
  CalculatePaydayPlan,
  type PaydayPlanParams,
} from '@domain/usecases/calculate-payday-plan';

describe('CalculatePaydayPlan', () => {
  const calc = new CalculatePaydayPlan();
  const now = Date.now();
  const inOneWeek = now + 7 * 86_400_000;
  const inTwoWeeks = now + 14 * 86_400_000;
  const inThirtyDays = now + 30 * 86_400_000;

  const baseParams: PaydayPlanParams = {
    incomeAmount: 500_000,
    incomeCurrency: 'USD',
    upcomingBills: [
      {name: 'Rent', amount: 150_000, currency: 'USD', dueDate: inOneWeek},
      {name: 'Internet', amount: 5_000, currency: 'USD', dueDate: inTwoWeeks},
    ],
    activeBudgets: [
      {name: 'Food', remaining: 30_000, currency: 'USD'},
      {name: 'Transport', remaining: 15_000, currency: 'USD'},
    ],
    currentWalletBalance: 100_000,
    nextPaydayDate: inThirtyDays,
  };

  it('calculates correct available amount after bills and budgets', () => {
    const result = calc.execute(baseParams);

    const expectedBills = 150_000 + 5_000;
    const expectedBudgets = 30_000 + 15_000;
    const expectedAvailable =
      100_000 + 500_000 - expectedBills - expectedBudgets;

    expect(result.availableToSpend).toBe(expectedAvailable);
    expect(result.upcomingBillsTotal).toBe(expectedBills);
    expect(result.budgetCommitmentsTotal).toBe(expectedBudgets);
    expect(result.currency).toBe('USD');
  });

  it('identifies the next upcoming bill', () => {
    const result = calc.execute(baseParams);
    expect(result.nextBillName).toBe('Rent');
    expect(result.nextBillDate).toBe(inOneWeek);
    expect(result.nextBillAmount).toBe(150_000);
  });

  it('calculates safe daily spending', () => {
    const result = calc.execute(baseParams);
    expect(result.safeDaily).toBeGreaterThan(0);
    expect(result.safeDaily).toBe(
      Math.floor(result.availableToSpend / 30),
    );
  });

  it('handles zero bills', () => {
    const result = calc.execute({
      ...baseParams,
      upcomingBills: [],
    });

    expect(result.upcomingBillsTotal).toBe(0);
    expect(result.nextBillName).toBe('');
    expect(result.nextBillDate).toBe(0);
    expect(result.nextBillAmount).toBe(0);
    expect(result.availableToSpend).toBe(
      100_000 + 500_000 - 45_000,
    );
  });

  it('handles zero budgets', () => {
    const result = calc.execute({
      ...baseParams,
      activeBudgets: [],
    });

    expect(result.budgetCommitmentsTotal).toBe(0);
    expect(result.availableToSpend).toBe(
      100_000 + 500_000 - 155_000,
    );
  });

  it('handles zero income', () => {
    const result = calc.execute({
      ...baseParams,
      incomeAmount: 0,
    });

    expect(result.availableToSpend).toBe(0);
  });

  it('never returns negative available amount', () => {
    const result = calc.execute({
      ...baseParams,
      incomeAmount: 10_000,
      currentWalletBalance: 0,
    });

    expect(result.availableToSpend).toBe(0);
  });

  it('ignores past-due bills', () => {
    const pastBill = {
      name: 'Old Bill',
      amount: 50_000,
      currency: 'USD',
      dueDate: now - 86_400_000,
    };
    const result = calc.execute({
      ...baseParams,
      upcomingBills: [pastBill, ...baseParams.upcomingBills],
    });

    expect(result.upcomingBillsTotal).toBe(155_000);
    expect(result.nextBillName).toBe('Rent');
  });

  it('treats negative budget remaining as zero commitment', () => {
    const result = calc.execute({
      ...baseParams,
      activeBudgets: [
        {name: 'Overspent', remaining: -5_000, currency: 'USD'},
      ],
    });

    expect(result.budgetCommitmentsTotal).toBe(0);
  });

  it('uses default 30-day period when no next payday given', () => {
    const result = calc.execute({
      ...baseParams,
      nextPaydayDate: undefined,
    });

    expect(result.safeDaily).toBe(
      Math.floor(result.availableToSpend / 30),
    );
  });
});
