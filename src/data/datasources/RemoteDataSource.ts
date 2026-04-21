const FX_API_BASE = 'https://v6.exchangerate-api.com/v6';

// Local structural shape of the ExchangeRate-API response. The canonical
// consumer-facing type lives in the infrastructure layer
// (`@infrastructure/currency/fx-types`). This duplicate avoids a
// Data -> Infrastructure sideways import while keeping the adapter
// structurally compatible.
type ExchangeRateApiPayload = {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
};

export type RemoteDataSource = {
  fetchExchangeRates(
    apiKey: string,
    baseCurrency: string,
  ): Promise<ExchangeRateApiPayload>;
};

async function fetchExchangeRates(
  apiKey: string,
  baseCurrency: string,
): Promise<ExchangeRateApiPayload> {
  const url = `${FX_API_BASE}/${apiKey}/latest/${baseCurrency.toUpperCase()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FX API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ExchangeRateApiPayload;

  if (data.result !== 'success') {
    throw new Error(`FX API returned error: ${data.result}`);
  }

  return data;
}

let instance: RemoteDataSource | null = null;

export function getRemoteDataSource(): RemoteDataSource {
  if (!instance) {
    instance = {
      fetchExchangeRates,
    };
  }
  return instance;
}
