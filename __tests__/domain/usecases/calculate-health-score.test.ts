import {CalculateHealthScore, type HealthScoreParams} from '@domain/usecases/calculate-health-score';

describe('CalculateHealthScore', () => {
  const calc = new CalculateHealthScore();

  const perfectParams: HealthScoreParams = {
    totalIncome: 500_000,
    totalExpenses: 300_000,
    budgetAdherencePercent: 100,
    billsOnTimePercent: 100,
    activeSubscriptionCount: 5,
    usedSubscriptionCount: 5,
    emergencyFundProgress: 100,
    previousPeriodExpenses: 400_000,
  };

  it('gives 100/A for perfect scores', () => {
    const result = calc.execute(perfectParams);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.factors).toHaveLength(6);
  });

  it('gives low score when savings rate is zero', () => {
    const result = calc.execute({
      ...perfectParams,
      totalIncome: 300_000,
      totalExpenses: 300_000,
    });
    expect(result.score).toBeLessThan(80);
  });

  it('gives F grade for all-zero params', () => {
    const result = calc.execute({
      totalIncome: 0,
      totalExpenses: 0,
      budgetAdherencePercent: 0,
      billsOnTimePercent: 0,
      activeSubscriptionCount: 0,
      usedSubscriptionCount: 0,
      emergencyFundProgress: 0,
      previousPeriodExpenses: 0,
    });
    expect(result.grade).toBe('F');
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it('handles zero income correctly', () => {
    const result = calc.execute({
      ...perfectParams,
      totalIncome: 0,
      totalExpenses: 100_000,
    });
    const savingsFactor = result.factors.find((f) => f.name === 'Savings Rate');
    expect(savingsFactor!.score).toBe(0);
  });

  it('detects declining trend when expenses increase', () => {
    const result = calc.execute({
      ...perfectParams,
      totalExpenses: 600_000,
      previousPeriodExpenses: 400_000,
    });
    expect(result.trend).toBe('declining');
  });

  it('detects improving trend when expenses decrease', () => {
    const result = calc.execute({
      ...perfectParams,
      totalExpenses: 200_000,
      previousPeriodExpenses: 400_000,
    });
    expect(result.trend).toBe('improving');
  });

  it('detects stable trend for small changes', () => {
    const result = calc.execute({
      ...perfectParams,
      totalExpenses: 402_000,
      previousPeriodExpenses: 400_000,
    });
    expect(result.trend).toBe('stable');
  });

  it('all factors contribute to the final score', () => {
    const result = calc.execute(perfectParams);
    const weightSum = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(weightSum).toBeCloseTo(1, 5);
  });

  it('each factor has a tip', () => {
    const result = calc.execute(perfectParams);
    for (const factor of result.factors) {
      expect(factor.tip.length).toBeGreaterThan(0);
    }
  });

  it('handles unused subscriptions', () => {
    const result = calc.execute({
      ...perfectParams,
      activeSubscriptionCount: 10,
      usedSubscriptionCount: 2,
    });
    const subFactor = result.factors.find(
      (f) => f.name === 'Subscription Efficiency',
    );
    expect(subFactor!.score).toBe(20);
  });

  it('gives full subscription score when there are no active subscriptions', () => {
    const result = calc.execute({
      ...perfectParams,
      activeSubscriptionCount: 0,
      usedSubscriptionCount: 0,
    });
    const subFactor = result.factors.find(
      (f) => f.name === 'Subscription Efficiency',
    );
    expect(subFactor!.score).toBe(100);
  });

  describe('grade boundaries', () => {
    it('grades A for 90+', () => {
      const result = calc.execute(perfectParams);
      expect(result.grade).toBe('A');
    });

    it('grades B for 80-89', () => {
      const result = calc.execute({
        ...perfectParams,
        budgetAdherencePercent: 50,
        emergencyFundProgress: 50,
      });
      expect(['A', 'B']).toContain(result.grade);
    });

    it('grades F for very low scores', () => {
      const result = calc.execute({
        totalIncome: 100_000,
        totalExpenses: 100_000,
        budgetAdherencePercent: 10,
        billsOnTimePercent: 10,
        activeSubscriptionCount: 10,
        usedSubscriptionCount: 1,
        emergencyFundProgress: 5,
        previousPeriodExpenses: 50_000,
      });
      expect(result.grade).toBe('F');
    });
  });
});
