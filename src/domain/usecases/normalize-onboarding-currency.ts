import {isValidCurrencyCode} from '@domain/value-objects/Currency';

const DEFAULT = 'USD';

/**
 * Returns a 3-letter ISO currency code for onboarding wallet defaults.
 * Invalid or empty input falls back to USD.
 */
export function normalizeOnboardingCurrencyCode(raw: string): string {
  const upper = (raw ?? '').trim().toUpperCase();
  if (upper.length !== 3 || !/^[A-Z]{3}$/.test(upper)) {
    return DEFAULT;
  }
  if (!isValidCurrencyCode(upper)) {
    return DEFAULT;
  }
  return upper;
}
