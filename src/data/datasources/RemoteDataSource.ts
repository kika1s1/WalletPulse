const FX_API_BASE = 'https://v6.exchangerate-api.com/v6';

export type FxApiResponse = {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
};

export type RemoteDataSource = {
  fetchExchangeRates(apiKey: string, baseCurrency: string): Promise<FxApiResponse>;
};

async function fetchExchangeRates(
  apiKey: string,
  baseCurrency: string,
): Promise<FxApiResponse> {
  const url = `${FX_API_BASE}/${apiKey}/latest/${baseCurrency.toUpperCase()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FX API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as FxApiResponse;

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
