import type {FxRate} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import {generateToken} from '@shared/utils/crypto';
import type {FxApiResponse} from './fx-types';

export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type FetchRatesFn = (
  apiKey: string,
  baseCurrency: string,
) => Promise<FxApiResponse>;

export type FetchAndCacheDeps = {
  fxRateRepo: IFxRateRepository;
  fetchRates: FetchRatesFn;
};

export function makeFetchAndCacheRates(deps: FetchAndCacheDeps) {
  return async function execute(
    apiKey: string,
    baseCurrency: string,
  ): Promise<FxRate[]> {
    const response = await deps.fetchRates(apiKey, baseCurrency);
    const now = Date.now();

    await deps.fxRateRepo.deleteStale(STALE_THRESHOLD_MS);

    const base = baseCurrency.toUpperCase();
    const rates: FxRate[] = [];

    for (const [code, rateValue] of Object.entries(
      response.conversion_rates,
    )) {
      const target = code.toUpperCase();
      if (target === base) {
        continue;
      }
      rates.push({
        id: generateToken(),
        baseCurrency: base,
        targetCurrency: target,
        rate: rateValue,
        fetchedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await deps.fxRateRepo.saveBatch(rates);
    return rates;
  };
}

export type GetConversionRateDeps = {
  fxRateRepo: IFxRateRepository;
};

export function makeGetConversionRate(deps: GetConversionRateDeps) {
  return async function getRate(
    from: string,
    to: string,
  ): Promise<number | null> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    if (fromUpper === toUpper) {
      return 1;
    }

    const direct = await deps.fxRateRepo.findRate(fromUpper, toUpper);
    if (direct) {
      return direct.rate;
    }

    const inverse = await deps.fxRateRepo.findRate(toUpper, fromUpper);
    if (inverse) {
      return 1 / inverse.rate;
    }

    const allFromBase = await deps.fxRateRepo.findAllByBase('USD');

    const fromToBase = allFromBase.find((r) => r.targetCurrency === fromUpper);
    const toFromBase = allFromBase.find((r) => r.targetCurrency === toUpper);

    if (fromToBase && toFromBase) {
      return toFromBase.rate / fromToBase.rate;
    }

    return null;
  };
}

export function convertAmountCents(
  amountCents: number,
  rate: number,
): number {
  return Math.round(amountCents * rate);
}
