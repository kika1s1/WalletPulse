export type FxRate = {
  readonly id: string;
  readonly baseCurrency: string;
  readonly targetCurrency: string;
  readonly rate: number;
  readonly fetchedAt: number;
  readonly createdAt: number;
  readonly updatedAt: number;
};

function assertIsoCurrency(code: string, field: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 3 || !/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`${field} must be a valid 3-letter ISO currency code`);
  }
  return normalized;
}

export type CreateFxRateInput = FxRate;

export function createFxRate(input: CreateFxRateInput): FxRate {
  const baseCurrency = assertIsoCurrency(input.baseCurrency, 'baseCurrency');
  const targetCurrency = assertIsoCurrency(input.targetCurrency, 'targetCurrency');
  if (typeof input.rate !== 'number' || !Number.isFinite(input.rate) || input.rate <= 0) {
    throw new Error('Rate must be a finite number greater than zero');
  }
  return {
    ...input,
    baseCurrency,
    targetCurrency,
  };
}

export function isStale(f: FxRate, nowMs: number, maxAgeMs: number): boolean {
  return nowMs - f.fetchedAt > maxAgeMs;
}

export function convert(f: FxRate, amountInCents: number): number {
  return Math.round(amountInCents * f.rate);
}

export function getInverseRate(f: FxRate): number {
  return 1 / f.rate;
}
