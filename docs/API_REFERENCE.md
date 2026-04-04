# WalletPulse: External API Reference

## Exchange Rate API

### Provider: ExchangeRate-API

**Website:** https://www.exchangerate-api.com/
**Plan:** Free tier (1,500 requests per month)

### Endpoint

```
GET https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE_CURRENCY}
```

### Example Request

```
GET https://v6.exchangerate-api.com/v6/abc123/latest/USD
```

### Example Response

```json
{
  "result": "success",
  "documentation": "https://www.exchangerate-api.com/docs",
  "terms_of_use": "https://www.exchangerate-api.com/terms",
  "time_last_update_unix": 1704067201,
  "time_last_update_utc": "Mon, 01 Jan 2024 00:00:01 +0000",
  "time_next_update_unix": 1704153601,
  "time_next_update_utc": "Tue, 02 Jan 2024 00:00:01 +0000",
  "base_code": "USD",
  "conversion_rates": {
    "USD": 1,
    "EUR": 0.9246,
    "GBP": 0.7863,
    "ETB": 56.2345,
    "JPY": 141.0400,
    "CAD": 1.3261,
    "AUD": 1.4726
  }
}
```

### Error Responses

| Status | Meaning | Action |
|--------|---------|--------|
| `"error"` result | Invalid API key or quota exceeded | Use cached rates |
| Network error | No internet connection | Use cached rates |
| Rate limit | Over 1500 requests per month | Use cached rates |

### Integration (Clean Architecture)

```ts
// src/infrastructure/currency/fx-api.ts

const FX_API_BASE = 'https://v6.exchangerate-api.com/v6';

type FxApiResponse = {
  result: 'success' | 'error';
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
};

export async function fetchLatestRates(baseCurrency: string): Promise<FxApiResponse> {
  const apiKey = Config.FX_API_KEY;
  const url = `${FX_API_BASE}/${apiKey}/latest/${baseCurrency}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FX API error: ${response.status}`);
  }

  const data: FxApiResponse = await response.json();
  if (data.result !== 'success') {
    throw new Error('FX API returned error result');
  }

  return data;
}
```

### TDD Test Example

```ts
// __tests__/infrastructure/currency/fx-api.test.ts
describe('fetchLatestRates', () => {
  it('should return conversion rates for valid base currency', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: 'success',
        base_code: 'USD',
        conversion_rates: { USD: 1, EUR: 0.92 },
      }),
    });

    const result = await fetchLatestRates('USD');
    expect(result.base_code).toBe('USD');
    expect(result.conversion_rates.EUR).toBe(0.92);
  });

  it('should throw on API error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'error' }),
    });

    await expect(fetchLatestRates('USD')).rejects.toThrow('FX API returned error result');
  });
});
```

### Caching Logic

```
1. On app launch:
   - Query fx_rates table for base_currency = user's base currency
   - If records exist and fetched_at is less than 24 hours old, use cached
   - If stale or missing, fetch from API

2. After successful fetch:
   - Delete old rates for this base_currency
   - Batch insert all conversion_rates
   - Set fetched_at to current timestamp

3. Background refresh:
   - react-native-background-fetch triggers every 12 hours
   - Fetches rates silently and updates cache
   - If API fails, keep existing cached rates (never delete without replacement)

4. Conversion calculation:
   - All rates are relative to base currency
   - To convert currency X to currency Y:
     result = amount * (rate_Y / rate_X)
```

## API Key Management

- Store API key in `.env` file (not committed to git)
- Access via `react-native-config` (Config.FX_API_KEY)
- Add `.env.example` with placeholder values to repo

```
# .env.example
FX_API_KEY=your_api_key_here
```

## Rate Limits and Quotas

| Metric | Free Tier |
|--------|-----------|
| Requests per month | 1,500 |
| Update frequency | Daily |
| Currencies | 160+ |
| Historical data | No |

With daily fetching for one base currency, usage is approximately 30 requests per month, well within limits.
