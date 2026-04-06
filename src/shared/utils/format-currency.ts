import {formatCurrencySymbol, isValidCurrencyCode} from '@domain/value-objects/Currency';

export function formatAmount(amountInCents: number, currency: string): string {
  if (isValidCurrencyCode(currency)) {
    return formatCurrencySymbol(currency, amountInCents);
  }
  const major = Math.abs(amountInCents) / 100;
  const sign = amountInCents < 0 ? '-' : '';
  return `${sign}${currency} ${major.toFixed(2)}`;
}

const MASKED = '••••••';

export function formatAmountMasked(amountInCents: number, currency: string, hidden: boolean): string {
  if (hidden) return `${MASKED} ${currency}`;
  return formatAmount(amountInCents, currency);
}

export function formatCompactAmount(amountInCents: number): string {
  const abs = Math.abs(amountInCents);
  const sign = amountInCents < 0 ? '-' : '';

  if (abs >= 100000000) {
    return `${sign}${(abs / 100000000).toFixed(1)}M`;
  }
  if (abs >= 100000) {
    return `${sign}${(abs / 100000).toFixed(1)}K`;
  }
  return `${sign}${(abs / 100).toFixed(2)}`;
}

export function centsToMajor(cents: number): number {
  return cents / 100;
}

export function majorToCents(major: number): number {
  return Math.round(major * 100);
}
