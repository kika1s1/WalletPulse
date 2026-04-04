export {SUPPORTED_CURRENCIES, isValidCurrencyCode} from '@domain/value-objects/Currency';

export const DEFAULT_BASE_CURRENCY = 'USD';

export const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF',
  'ETB', 'NGN', 'KES', 'GHS', 'ZAR', 'INR', 'CNY',
] as const;
