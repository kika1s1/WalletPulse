export type HealthScoreParams = {
  totalIncome: number;
  totalExpenses: number;
  budgetAdherencePercent: number;
  billsOnTimePercent: number;
  activeSubscriptionCount: number;
  usedSubscriptionCount: number;
  emergencyFundProgress: number;
  previousPeriodExpenses: number;
};

export type HealthScoreFactor = {
  name: string;
  score: number;
  weight: number;
  tip: string;
};

export type HealthScoreResult = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: HealthScoreFactor[];
  trend: 'improving' | 'stable' | 'declining';
};

const WEIGHTS = {
  savingsRate: 0.3,
  budgetAdherence: 0.2,
  billConsistency: 0.15,
  emergencyFund: 0.15,
  subscriptionEfficiency: 0.1,
  spendingTrend: 0.1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) {
    return 'A';
  }
  if (score >= 80) {
    return 'B';
  }
  if (score >= 65) {
    return 'C';
  }
  if (score >= 50) {
    return 'D';
  }
  return 'F';
}

function computeSavingsRate(income: number, expenses: number): number {
  if (income <= 0) {
    return 0;
  }
  const rate = (income - expenses) / income;
  if (rate >= 0.3) {
    return 100;
  }
  if (rate <= 0) {
    return 0;
  }
  return Math.round((rate / 0.3) * 100);
}

function computeSubscriptionEfficiency(
  active: number,
  used: number,
): number {
  if (active <= 0) {
    return 100;
  }
  return Math.round(clamp(used / active, 0, 1) * 100);
}

function computeSpendingTrend(
  current: number,
  previous: number,
): {score: number; trend: 'improving' | 'stable' | 'declining'} {
  if (previous <= 0) {
    return {score: 100, trend: 'stable'};
  }
  const changePercent = ((current - previous) / previous) * 100;
  if (changePercent <= -10) {
    return {score: 100, trend: 'improving'};
  }
  if (changePercent <= 0) {
    return {score: 80, trend: 'improving'};
  }
  if (changePercent <= 5) {
    return {score: 60, trend: 'stable'};
  }
  if (changePercent <= 15) {
    return {score: 30, trend: 'declining'};
  }
  return {score: 0, trend: 'declining'};
}

export class CalculateHealthScore {
  execute(params: HealthScoreParams): HealthScoreResult {
    const savingsScore = computeSavingsRate(
      params.totalIncome,
      params.totalExpenses,
    );
    const budgetScore = clamp(Math.round(params.budgetAdherencePercent), 0, 100);
    const billScore = clamp(Math.round(params.billsOnTimePercent), 0, 100);
    const emergencyScore = clamp(Math.round(params.emergencyFundProgress), 0, 100);
    const subScore = computeSubscriptionEfficiency(
      params.activeSubscriptionCount,
      params.usedSubscriptionCount,
    );
    const {score: trendScore, trend} = computeSpendingTrend(
      params.totalExpenses,
      params.previousPeriodExpenses,
    );

    const factors: HealthScoreFactor[] = [
      {
        name: 'Savings Rate',
        score: savingsScore,
        weight: WEIGHTS.savingsRate,
        tip:
          savingsScore >= 80
            ? 'Great savings rate! Keep it up.'
            : 'Try to save at least 20% of your income each month.',
      },
      {
        name: 'Budget Adherence',
        score: budgetScore,
        weight: WEIGHTS.budgetAdherence,
        tip:
          budgetScore >= 80
            ? 'You are sticking to your budgets well.'
            : 'Review categories where you overspend and adjust limits.',
      },
      {
        name: 'Bill Consistency',
        score: billScore,
        weight: WEIGHTS.billConsistency,
        tip:
          billScore >= 80
            ? 'Bills paid on time, nice work.'
            : 'Set reminders to avoid missed payments.',
      },
      {
        name: 'Emergency Fund',
        score: emergencyScore,
        weight: WEIGHTS.emergencyFund,
        tip:
          emergencyScore >= 80
            ? 'Your emergency fund is in good shape.'
            : 'Aim for 3 to 6 months of expenses saved.',
      },
      {
        name: 'Subscription Efficiency',
        score: subScore,
        weight: WEIGHTS.subscriptionEfficiency,
        tip:
          subScore >= 80
            ? 'Your subscriptions are well utilized.'
            : 'Cancel subscriptions you no longer use.',
      },
      {
        name: 'Spending Trend',
        score: trendScore,
        weight: WEIGHTS.spendingTrend,
        tip:
          trendScore >= 60
            ? 'Your spending trend looks healthy.'
            : 'Your spending increased significantly this period.',
      },
    ];

    const rawScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight,
      0,
    );
    const score = Math.round(clamp(rawScore, 0, 100));

    return {
      score,
      grade: scoreToGrade(score),
      factors,
      trend,
    };
  }
}
