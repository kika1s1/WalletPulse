import type {ITransactionRepository, TransactionFilter} from '@domain/repositories/ITransactionRepository';
import {calculateChange, calculatePercentage, type Percentage} from '@domain/value-objects/Percentage';

export type AnalyticsSummary = {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  transactionCount: number;
  averageTransaction: number;
  topCategories: Array<{categoryId: string; total: number; percentage: Percentage}>;
  dailySpending: Array<{date: string; amount: number}>;
  incomeVsExpenseChange: Percentage;
};

type Deps = {
  transactionRepo: ITransactionRepository;
};

export type CalculateAnalyticsApi = {
  execute(filter: TransactionFilter): Promise<AnalyticsSummary>;
};

function toUtcDateKey(transactionDateMs: number): string {
  return new Date(transactionDateMs).toISOString().slice(0, 10);
}

export function makeCalculateAnalytics({transactionRepo}: Deps): CalculateAnalyticsApi {
  return {
    async execute(filter) {
      const transactions = await transactionRepo.findAll(filter);

      if (transactions.length === 0) {
        return {
          totalIncome: 0,
          totalExpenses: 0,
          netFlow: 0,
          transactionCount: 0,
          averageTransaction: 0,
          topCategories: [],
          dailySpending: [],
          incomeVsExpenseChange: calculateChange(0, 0),
        };
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      let expenseCount = 0;

      const categoryTotals = new Map<string, number>();
      const dayTotals = new Map<string, number>();

      for (const t of transactions) {
        if (t.type === 'income') {
          totalIncome += t.amount;
        } else if (t.type === 'expense') {
          totalExpenses += t.amount;
          expenseCount += 1;
          const prevCat = categoryTotals.get(t.categoryId) ?? 0;
          categoryTotals.set(t.categoryId, prevCat + t.amount);
          const dateKey = toUtcDateKey(t.transactionDate);
          const prevDay = dayTotals.get(dateKey) ?? 0;
          dayTotals.set(dateKey, prevDay + t.amount);
        }
      }

      const netFlow = totalIncome - totalExpenses;
      const averageTransaction = expenseCount === 0 ? 0 : totalExpenses / expenseCount;

      const topCategories = [...categoryTotals.entries()]
        .map(([categoryId, total]) => ({
          categoryId,
          total,
          percentage: calculatePercentage(total, totalExpenses),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const dailySpending = [...dayTotals.entries()]
        .map(([date, amount]) => ({date, amount}))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalIncome,
        totalExpenses,
        netFlow,
        transactionCount: transactions.length,
        averageTransaction,
        topCategories,
        dailySpending,
        incomeVsExpenseChange: calculateChange(totalExpenses, totalIncome),
      };
    },
  };
}
