/**
 * Wire-format type for the external ExchangeRate-API response.
 * Owned by the infrastructure layer because it is a contract with an
 * external HTTP service, not a domain or persistence concern.
 */
export type FxApiResponse = {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
};
