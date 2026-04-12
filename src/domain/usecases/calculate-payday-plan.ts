export type UpcomingBill = {
  name: string;
  amount: number;
  currency: string;
  dueDate: number;
};

export type ActiveBudgetEntry = {
  name: string;
  remaining: number;
  currency: string;
};

export type PaydayPlanParams = {
  incomeAmount: number;
  incomeCurrency: string;
  upcomingBills: UpcomingBill[];
  activeBudgets: ActiveBudgetEntry[];
  currentWalletBalance: number;
  nextPaydayDate?: number;
};

export type PaydayPlanResult = {
  availableToSpend: number;
  currency: string;
  upcomingBillsTotal: number;
  budgetCommitmentsTotal: number;
  nextBillName: string;
  nextBillDate: number;
  nextBillAmount: number;
  safeDaily: number;
};

const MS_PER_DAY = 86_400_000;
const DEFAULT_PAYDAY_DAYS = 30;

function daysUntil(targetMs: number, nowMs: number): number {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / MS_PER_DAY);
}

export class CalculatePaydayPlan {
  execute(params: PaydayPlanParams): PaydayPlanResult {
    const now = Date.now();
    const currency = params.incomeCurrency;

    const sortedBills = [...params.upcomingBills]
      .filter((b) => b.dueDate > now)
      .sort((a, b) => a.dueDate - b.dueDate);

    const upcomingBillsTotal = sortedBills.reduce(
      (sum, b) => sum + b.amount,
      0,
    );

    const budgetCommitmentsTotal = params.activeBudgets.reduce(
      (sum, b) => sum + Math.max(b.remaining, 0),
      0,
    );

    const totalAfterIncome = params.currentWalletBalance + params.incomeAmount;
    const availableToSpend = Math.max(
      totalAfterIncome - upcomingBillsTotal - budgetCommitmentsTotal,
      0,
    );

    const nextBill = sortedBills[0];
    const nextBillName = nextBill?.name ?? '';
    const nextBillDate = nextBill?.dueDate ?? 0;
    const nextBillAmount = nextBill?.amount ?? 0;

    const daysToPayday = params.nextPaydayDate
      ? Math.max(daysUntil(params.nextPaydayDate, now), 1)
      : DEFAULT_PAYDAY_DAYS;

    const safeDaily = Math.floor(availableToSpend / daysToPayday);

    return {
      availableToSpend,
      currency,
      upcomingBillsTotal,
      budgetCommitmentsTotal,
      nextBillName,
      nextBillDate,
      nextBillAmount,
      safeDaily,
    };
  }
}
