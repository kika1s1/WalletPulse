import {
  AnalyzeCurrencyTiming,
  type HistoricalRate,
} from '@domain/usecases/analyze-currency-timing';

describe('AnalyzeCurrencyTiming', () => {
  const analyzer = new AnalyzeCurrencyTiming();
  const now = Date.now();
  const day = 86_400_000;

  function makeRates(
    count: number,
    baseRate: number,
    trendFn?: (i: number) => number,
  ): HistoricalRate[] {
    return Array.from({length: count}, (_, i) => ({
      rate: trendFn ? trendFn(i) : baseRate,
      date: now - (count - 1 - i) * day,
    }));
  }

  it('recommends buy_now when current rate is above 30-day average', () => {
    const rates = makeRates(30, 1.1);
    rates.push({rate: 1.2, date: now + day});

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.currentRate).toBe(1.2);
    expect(result.isAboveAverage).toBe(true);
    expect(result.recommendation).toBe('buy_now');
  });

  it('returns neutral when rate is at average', () => {
    const rates = makeRates(30, 1.0);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.recommendation).toBe('neutral');
    expect(result.percentAboveAverage).toBe(0);
  });

  it('recommends wait when rate is below average', () => {
    const rates = makeRates(30, 1.1);
    rates.push({rate: 1.0, date: now + day});

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.recommendation).toBe('wait');
  });

  it('detects rising trend', () => {
    const rates = makeRates(30, 0, (i) => 1.0 + i * 0.01);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'GBP'},
      historicalRates: rates,
    });

    expect(result.trend).toBe('rising');
  });

  it('detects falling trend', () => {
    const rates = makeRates(30, 0, (i) => 1.3 - i * 0.01);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'GBP'},
      historicalRates: rates,
    });

    expect(result.trend).toBe('falling');
  });

  it('detects stable trend for flat rates', () => {
    const rates = makeRates(30, 1.0);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'GBP'},
      historicalRates: rates,
    });

    expect(result.trend).toBe('stable');
  });

  it('identifies best and worst rates in period', () => {
    const rates: HistoricalRate[] = [
      {rate: 1.0, date: now - 20 * day},
      {rate: 1.5, date: now - 10 * day},
      {rate: 0.8, date: now - 5 * day},
      {rate: 1.1, date: now},
    ];

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.bestRateInPeriod.rate).toBe(1.5);
    expect(result.worstRateInPeriod.rate).toBe(0.8);
  });

  it('assigns high confidence for 60+ data points', () => {
    const rates = makeRates(60, 1.0);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.confidence).toBe('high');
  });

  it('assigns medium confidence for 20-59 data points', () => {
    const rates = makeRates(25, 1.0);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.confidence).toBe('medium');
  });

  it('assigns low confidence for fewer than 20 data points', () => {
    const rates = makeRates(10, 1.0);

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.confidence).toBe('low');
  });

  it('handles empty rates', () => {
    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: [],
    });

    expect(result.currentRate).toBe(0);
    expect(result.recommendation).toBe('neutral');
    expect(result.confidence).toBe('low');
    expect(result.trend).toBe('stable');
  });

  it('recommends wait on falling trend even if above average', () => {
    const rates = makeRates(30, 0, (i) => 1.5 - i * 0.01);
    rates.push({rate: 1.25, date: now + day});

    const result = analyzer.execute({
      currencyPair: {from: 'USD', to: 'EUR'},
      historicalRates: rates,
    });

    expect(result.trend).toBe('falling');
    expect(result.recommendation).toBe('wait');
  });
});
