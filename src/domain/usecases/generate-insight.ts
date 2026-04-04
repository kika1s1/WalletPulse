import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {getWeekRange} from '@domain/value-objects/DateRange';
import {calculateChange} from '@domain/value-objects/Percentage';

const LOW_BALANCE_THRESHOLD_CENTS = 50_000;

export type Insight = {
  id: string;
  type:
    | 'spending_change'
    | 'low_balance'
    | 'bills_due'
    | 'subscription_cost'
    | 'goal_progress'
    | 'unusual_transaction';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
  relatedEntityId?: string;
};

type Deps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

export type GenerateInsightsApi = {
  execute(nowMs: number): Promise<Insight[]>;
};

export function makeGenerateInsights({transactionRepo, walletRepo}: Deps): GenerateInsightsApi {
  return {
    async execute(nowMs) {
      const insights: Insight[] = [];

      const thisWeek = getWeekRange(nowMs);
      const lastWeekEndMs = thisWeek.startMs - 1;
      const lastWeek = getWeekRange(lastWeekEndMs);

      const thisWeekExpenses = await transactionRepo.sumByFilter({
        type: 'expense',
        dateRange: thisWeek,
      });
      const lastWeekExpenses = await transactionRepo.sumByFilter({
        type: 'expense',
        dateRange: lastWeek,
      });

      const spendingChange = calculateChange(lastWeekExpenses, thisWeekExpenses);
      if (spendingChange.value > 20) {
        insights.push({
          id: 'insight-spending-change',
          type: 'spending_change',
          title: 'Spending rose versus last week',
          message: `Weekly expenses are about ${Math.round(spendingChange.value)}% higher than the prior week.`,
          severity: 'warning',
        });
      }

      const activeWallets = await walletRepo.findActive();
      for (const wallet of activeWallets) {
        if (wallet.balance < LOW_BALANCE_THRESHOLD_CENTS) {
          insights.push({
            id: `insight-low-balance-${wallet.id}`,
            type: 'low_balance',
            title: 'Low wallet balance',
            message: `Wallet "${wallet.name}" is below $500.`,
            severity: 'warning',
            relatedEntityId: wallet.id,
          });
        }
      }

      return insights;
    },
  };
}
