import {normalizeOnboardingCurrencyCode} from '@domain/usecases/normalize-onboarding-currency';

describe('normalizeOnboardingCurrencyCode', () => {
  it('returns uppercase valid codes', () => {
    expect(normalizeOnboardingCurrencyCode('usd')).toBe('USD');
    expect(normalizeOnboardingCurrencyCode('ETB')).toBe('ETB');
  });

  it('returns USD for empty or invalid', () => {
    expect(normalizeOnboardingCurrencyCode('')).toBe('USD');
    expect(normalizeOnboardingCurrencyCode('XX')).toBe('USD');
    expect(normalizeOnboardingCurrencyCode('US')).toBe('USD');
    expect(normalizeOnboardingCurrencyCode('USDD')).toBe('USD');
  });
});
