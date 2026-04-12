export type HistoricalRate = {
  rate: number;
  date: number;
};

export type CurrencyTimingParams = {
  currencyPair: {from: string; to: string};
  historicalRates: HistoricalRate[];
};

export type CurrencyTimingResult = {
  currentRate: number;
  average30Day: number;
  average90Day: number;
  isAboveAverage: boolean;
  percentAboveAverage: number;
  recommendation: 'buy_now' | 'wait' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
  bestRateInPeriod: {rate: number; date: number};
  worstRateInPeriod: {rate: number; date: number};
  trend: 'rising' | 'falling' | 'stable';
};

const MS_PER_DAY = 86_400_000;

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function ratesInWindow(
  rates: HistoricalRate[],
  days: number,
  now: number,
): number[] {
  const cutoff = now - days * MS_PER_DAY;
  return rates.filter((r) => r.date >= cutoff).map((r) => r.rate);
}

function computeTrend(rates: HistoricalRate[]): 'rising' | 'falling' | 'stable' {
  if (rates.length < 3) {
    return 'stable';
  }

  const sorted = [...rates].sort((a, b) => a.date - b.date);
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const firstAvg = average(firstHalf.map((r) => r.rate));
  const secondAvg = average(secondHalf.map((r) => r.rate));

  if (firstAvg === 0) {
    return 'stable';
  }

  const changePct = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (changePct > 2) {
    return 'rising';
  }
  if (changePct < -2) {
    return 'falling';
  }
  return 'stable';
}

export class AnalyzeCurrencyTiming {
  execute(params: CurrencyTimingParams): CurrencyTimingResult {
    const {historicalRates} = params;

    if (historicalRates.length === 0) {
      return {
        currentRate: 0,
        average30Day: 0,
        average90Day: 0,
        isAboveAverage: false,
        percentAboveAverage: 0,
        recommendation: 'neutral',
        confidence: 'low',
        bestRateInPeriod: {rate: 0, date: 0},
        worstRateInPeriod: {rate: 0, date: 0},
        trend: 'stable',
      };
    }

    const sorted = [...historicalRates].sort((a, b) => b.date - a.date);
    const currentRate = sorted[0].rate;
    const now = sorted[0].date;

    const rates30 = ratesInWindow(sorted, 30, now);
    const rates90 = ratesInWindow(sorted, 90, now);

    const avg30 = average(rates30);
    const avg90 = average(rates90);

    const referenceAvg = rates30.length >= 5 ? avg30 : avg90;
    const isAboveAverage = referenceAvg > 0 && currentRate > referenceAvg;
    const percentAboveAverage =
      referenceAvg > 0
        ? Math.round(((currentRate - referenceAvg) / referenceAvg) * 100)
        : 0;

    let best = sorted[0];
    let worst = sorted[0];
    for (const r of sorted) {
      if (r.rate > best.rate) {
        best = r;
      }
      if (r.rate < worst.rate) {
        worst = r;
      }
    }

    const trend = computeTrend(sorted);

    const confidence: CurrencyTimingResult['confidence'] =
      historicalRates.length >= 60
        ? 'high'
        : historicalRates.length >= 20
          ? 'medium'
          : 'low';

    let recommendation: CurrencyTimingResult['recommendation'];
    if (percentAboveAverage >= 3 && trend !== 'falling') {
      recommendation = 'buy_now';
    } else if (percentAboveAverage <= -3 || trend === 'falling') {
      recommendation = 'wait';
    } else {
      recommendation = 'neutral';
    }

    return {
      currentRate,
      average30Day: Math.round(avg30 * 10000) / 10000,
      average90Day: Math.round(avg90 * 10000) / 10000,
      isAboveAverage,
      percentAboveAverage,
      recommendation,
      confidence,
      bestRateInPeriod: {rate: best.rate, date: best.date},
      worstRateInPeriod: {rate: worst.rate, date: worst.date},
      trend,
    };
  }
}
