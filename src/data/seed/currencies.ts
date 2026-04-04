import {POPULAR_CURRENCIES, DEFAULT_BASE_CURRENCY} from '@shared/constants/currencies';
import {SUPPORTED_CURRENCIES} from '@domain/value-objects/Currency';

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  flag?: string;
  isPopular: boolean;
};

export function getCurrencyOptions(): CurrencyOption[] {
  const popularSet = new Set<string>(POPULAR_CURRENCIES);

  return SUPPORTED_CURRENCIES.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    flag: c.flag,
    isPopular: popularSet.has(c.code),
  })).sort((a, b) => {
    if (a.isPopular && !b.isPopular) {
      return -1;
    }
    if (!a.isPopular && b.isPopular) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function getDefaultBaseCurrency(): string {
  return DEFAULT_BASE_CURRENCY;
}
