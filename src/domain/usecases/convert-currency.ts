import {convert as convertFxAmount} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import {createMoney} from '@domain/value-objects/Money';

export type ConvertCurrencyDeps = {
  fxRateRepo: IFxRateRepository;
};

export type ConvertCurrencyResult = {
  amountInCents: number;
  currency: string;
  rate: number;
};

export function makeConvertCurrency(deps: ConvertCurrencyDeps) {
  return async function execute(
    amountInCents: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConvertCurrencyResult> {
    const from = createMoney(amountInCents, fromCurrency).currency;
    const to = createMoney(0, toCurrency).currency;

    if (from === to) {
      return {amountInCents, currency: to, rate: 1};
    }

    const direct = await deps.fxRateRepo.findRate(from, to);
    if (direct !== null) {
      return {
        amountInCents: convertFxAmount(direct, amountInCents),
        currency: to,
        rate: direct.rate,
      };
    }

    const inverse = await deps.fxRateRepo.findRate(to, from);
    if (inverse !== null) {
      const effectiveRate = 1 / inverse.rate;
      const converted = Math.round(amountInCents * effectiveRate);
      return {amountInCents: converted, currency: to, rate: effectiveRate};
    }

    throw new Error('No exchange rate found for this currency pair');
  };
}
