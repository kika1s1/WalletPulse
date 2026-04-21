---
name: currency-conversion
description: Multi-currency handling, FX rate fetching, caching, and conversion logic for WalletPulse. Use when working with currency conversion, exchange rates, wallet balances, or multi-currency display.
---

# Currency Conversion Skill

## Overview

WalletPulse supports all global currencies with a user-selected base currency. All amounts are stored in their original currency and converted on the fly for display.

## FX Rate Source

Primary: ExchangeRate-API (free tier, 1500 requests per month)
Endpoint: `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE}`

Fallback: Open Exchange Rates or most recent cached rates.

## Rate Caching Strategy

```
1. App launch: check fx_rates table (Supabase) for today's rates
2. If stale (older than 24h): fetch new rates from ExchangeRate-API
3. Persist via FxRateRepository into the Supabase fx_rates table
4. If offline: use most recent cached rates (never fail on missing network)
```

## Domain Value Object: Money

```ts
// src/domain/value-objects/Money.ts
export type Money = {
  amountCents: number;
  currency: string;
};

export function createMoney(amountCents: number, currency: string): Money {
  return { amountCents, currency: currency.toUpperCase() };
}

export function convert(
  money: Money,
  toCurrency: string,
  rates: Record<string, number>,
): Money {
  if (money.currency === toCurrency) return money;
  const fromRate = rates[money.currency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return money;
  return createMoney(Math.round((money.amountCents / fromRate) * toRate), toCurrency);
}

export function formatMoney(money: Money): string {
  const amount = money.amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
```

## TDD Test Example

```ts
describe('Money.convert', () => {
  const rates = { USD: 1, EUR: 0.92, GBP: 0.79, ETB: 56.23 };

  it('should return same money when currencies match', () => {
    const usd = createMoney(10000, 'USD');
    expect(convert(usd, 'USD', rates)).toEqual(usd);
  });

  it('should convert USD to EUR correctly', () => {
    const usd = createMoney(10000, 'USD');
    const result = convert(usd, 'EUR', rates);
    expect(result.amountCents).toBe(9200);
    expect(result.currency).toBe('EUR');
  });

  it('should return original money when target rate is missing', () => {
    const usd = createMoney(10000, 'USD');
    expect(convert(usd, 'XYZ', rates)).toEqual(usd);
  });
});
```

## Display Rules

- Dashboard shows totals in base currency
- Transaction list shows original currency + base currency equivalent in smaller text
- Wallet screens show balance in wallet currency
- Analytics charts can toggle between original and base currency
- Format: symbol + amount + ISO code (e.g., "$1,234.56 USD")
- Income in green, expense in red, transfer in purple
