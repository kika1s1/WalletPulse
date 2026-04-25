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
  if (hidden) {return `${MASKED} ${currency}`;}
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

const COMPACT_THRESHOLD_CHARS = 10;

export function formatAmountCompact(amountInCents: number, currency: string): string {
  const full = formatAmount(amountInCents, currency);
  if (full.length <= COMPACT_THRESHOLD_CHARS) {
    return full;
  }
  const symbol = (() => {
    if (isValidCurrencyCode(currency)) {
      try {
        const parts = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol',
        }).formatToParts(0);
        const sym = parts.find((p) => p.type === 'currency')?.value;
        return sym ?? currency;
      } catch {
        return currency;
      }
    }
    return currency;
  })();
  return `${symbol}${formatCompactAmount(amountInCents)}`;
}

export function formatAmountCompactMasked(
  amountInCents: number,
  currency: string,
  hidden: boolean,
): string {
  if (hidden) {return `${MASKED} ${currency}`;}
  return formatAmountCompact(amountInCents, currency);
}

export function centsToMajor(cents: number): number {
  return cents / 100;
}

export function majorToCents(major: number): number {
  return Math.round(major * 100);
}
