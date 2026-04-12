export type MoneyLostTransaction = {
  date: number;
  amount: number;
  currency: string;
  appliedRate: number;
  midMarketRate: number;
  source: string;
};

export type MoneyLostParams = {
  transactions: MoneyLostTransaction[];
  targetCurrency: string;
};

export type SourceBreakdown = {
  source: string;
  totalLost: number;
  count: number;
};

export type MonthBreakdown = {
  month: string;
  totalLost: number;
};

export type WorstTransaction = {
  date: number;
  amount: number;
  lostAmount: number;
  source: string;
};

export type MoneyLostResult = {
  totalLost: number;
  currency: string;
  transactionCount: number;
  averageLossPerTransaction: number;
  worstTransaction: WorstTransaction | null;
  bySource: SourceBreakdown[];
  byMonth: MonthBreakdown[];
  savingsTip: string;
};

function monthKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function computeLoss(tx: MoneyLostTransaction): number {
  if (tx.midMarketRate <= 0 || tx.appliedRate <= 0) {
    return 0;
  }
  const idealValue = tx.amount * tx.midMarketRate;
  const actualValue = tx.amount * tx.appliedRate;
  const diff = idealValue - actualValue;
  return Math.max(Math.round(diff), 0);
}

export class CalculateMoneyLost {
  execute(params: MoneyLostParams): MoneyLostResult {
    const {transactions, targetCurrency} = params;

    if (transactions.length === 0) {
      return {
        totalLost: 0,
        currency: targetCurrency,
        transactionCount: 0,
        averageLossPerTransaction: 0,
        worstTransaction: null,
        bySource: [],
        byMonth: [],
        savingsTip: 'No conversion transactions found yet.',
      };
    }

    let totalLost = 0;
    let worstLoss = 0;
    let worstTx: MoneyLostTransaction | null = null;

    const sourceMap = new Map<string, {total: number; count: number}>();
    const monthMap = new Map<string, number>();

    for (const tx of transactions) {
      const loss = computeLoss(tx);
      totalLost += loss;

      if (loss > worstLoss) {
        worstLoss = loss;
        worstTx = tx;
      }

      const src = sourceMap.get(tx.source) ?? {total: 0, count: 0};
      src.total += loss;
      src.count += 1;
      sourceMap.set(tx.source, src);

      const mk = monthKey(tx.date);
      monthMap.set(mk, (monthMap.get(mk) ?? 0) + loss);
    }

    const bySource: SourceBreakdown[] = [...sourceMap.entries()]
      .map(([source, data]) => ({
        source,
        totalLost: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.totalLost - a.totalLost);

    const byMonth: MonthBreakdown[] = [...monthMap.entries()]
      .map(([month, total]) => ({month, totalLost: total}))
      .sort((a, b) => a.month.localeCompare(b.month));

    const averageLossPerTransaction =
      transactions.length > 0
        ? Math.round(totalLost / transactions.length)
        : 0;

    const worstTransaction: WorstTransaction | null = worstTx
      ? {
          date: worstTx.date,
          amount: worstTx.amount,
          lostAmount: worstLoss,
          source: worstTx.source,
        }
      : null;

    const topSource = bySource[0]?.source;
    const savingsTip = totalLost > 0
      ? `Consider using a service with lower fees for ${topSource ?? 'your'} transfers. You could save up to ${averageLossPerTransaction} cents per transaction.`
      : 'Your conversion rates look good. Keep monitoring for changes.';

    return {
      totalLost,
      currency: targetCurrency,
      transactionCount: transactions.length,
      averageLossPerTransaction,
      worstTransaction,
      bySource,
      byMonth,
      savingsTip,
    };
  }
}
