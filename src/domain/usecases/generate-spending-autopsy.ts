export type AutopsyTransaction = {
  amount: number;
  categoryId: string;
  transactionDate: number;
  type: 'income' | 'expense' | 'transfer';
};

export type AutopsyCategory = {
  id: string;
  name: string;
};

export type AutopsyParams = {
  currentPeriodTransactions: AutopsyTransaction[];
  previousPeriodTransactions: AutopsyTransaction[];
  categories: AutopsyCategory[];
};

export type AutopsyInsight = {
  type:
    | 'overspend'
    | 'savings_opportunity'
    | 'trend'
    | 'subscription_waste'
    | 'positive';
  title: string;
  description: string;
  savingsEstimate: number;
  category?: string;
  severity: 'info' | 'warning' | 'critical';
};

export type AutopsyResult = {
  insights: AutopsyInsight[];
  totalSpent: number;
  topCategory: string;
  biggestChange: string;
  periodComparison: {
    current: number;
    previous: number;
    changePercent: number;
  };
};

type CategorySpending = Map<string, number>;

function sumByCategory(txns: AutopsyTransaction[]): CategorySpending {
  const map = new Map<string, number>();
  for (const tx of txns) {
    if (tx.type !== 'expense') {
      continue;
    }
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
  }
  return map;
}

function totalExpenses(txns: AutopsyTransaction[]): number {
  return txns
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
}

function categoryName(
  categories: AutopsyCategory[],
  id: string,
): string {
  return categories.find((c) => c.id === id)?.name ?? id;
}

function changePercent(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export class GenerateSpendingAutopsy {
  execute(params: AutopsyParams): AutopsyResult {
    const {currentPeriodTransactions, previousPeriodTransactions, categories} =
      params;

    const currentTotal = totalExpenses(currentPeriodTransactions);
    const previousTotal = totalExpenses(previousPeriodTransactions);
    const overallChange = changePercent(currentTotal, previousTotal);

    const currentByCategory = sumByCategory(currentPeriodTransactions);
    const previousByCategory = sumByCategory(previousPeriodTransactions);

    const topCategoryEntry = [...currentByCategory.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const topCategory = topCategoryEntry
      ? categoryName(categories, topCategoryEntry[0])
      : 'None';

    const categoryChanges: {
      id: string;
      name: string;
      current: number;
      previous: number;
      diff: number;
      pct: number;
    }[] = [];

    const allCategoryIds = new Set([
      ...currentByCategory.keys(),
      ...previousByCategory.keys(),
    ]);

    for (const catId of allCategoryIds) {
      const cur = currentByCategory.get(catId) ?? 0;
      const prev = previousByCategory.get(catId) ?? 0;
      categoryChanges.push({
        id: catId,
        name: categoryName(categories, catId),
        current: cur,
        previous: prev,
        diff: cur - prev,
        pct: changePercent(cur, prev),
      });
    }

    categoryChanges.sort((a, b) => b.diff - a.diff);

    const biggestChange = categoryChanges[0]?.name ?? 'None';

    const insights: AutopsyInsight[] = [];

    const overspends = categoryChanges
      .filter((c) => c.diff > 0 && c.pct >= 20)
      .slice(0, 3);

    for (const os of overspends) {
      const severity: AutopsyInsight['severity'] =
        os.pct >= 50 ? 'critical' : 'warning';
      insights.push({
        type: 'overspend',
        title: `${os.name} spending up ${os.pct}%`,
        description: `You spent ${os.diff} cents more on ${os.name} compared to last period.`,
        savingsEstimate: os.diff,
        category: os.name,
        severity,
      });
    }

    const savings = categoryChanges
      .filter((c) => c.diff < 0 && c.pct <= -15)
      .slice(0, 2);

    for (const s of savings) {
      insights.push({
        type: 'positive',
        title: `${s.name} spending down ${Math.abs(s.pct)}%`,
        description: `Great work! You saved ${Math.abs(s.diff)} cents on ${s.name} this period.`,
        savingsEstimate: Math.abs(s.diff),
        category: s.name,
        severity: 'info',
      });
    }

    if (overallChange > 10 && previousTotal > 0) {
      insights.push({
        type: 'trend',
        title: `Overall spending increased ${overallChange}%`,
        description:
          'Your total expenses grew compared to the previous period. Review your biggest categories for potential cuts.',
        savingsEstimate: currentTotal - previousTotal,
        severity: overallChange >= 30 ? 'critical' : 'warning',
      });
    } else if (overallChange < -10 && previousTotal > 0) {
      insights.push({
        type: 'positive',
        title: `Overall spending decreased ${Math.abs(overallChange)}%`,
        description:
          'You spent less this period. Keep up the good habits.',
        savingsEstimate: 0,
        severity: 'info',
      });
    }

    const newCategories = categoryChanges.filter(
      (c) => c.previous === 0 && c.current > 0,
    );
    for (const nc of newCategories.slice(0, 2)) {
      insights.push({
        type: 'savings_opportunity',
        title: `New spending in ${nc.name}`,
        description: `You started spending on ${nc.name} this period. Make sure this is intentional.`,
        savingsEstimate: nc.current,
        category: nc.name,
        severity: 'info',
      });
    }

    return {
      insights,
      totalSpent: currentTotal,
      topCategory,
      biggestChange,
      periodComparison: {
        current: currentTotal,
        previous: previousTotal,
        changePercent: overallChange,
      },
    };
  }
}
