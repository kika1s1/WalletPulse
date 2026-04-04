import type {FxRate} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import {makeConvertCurrency} from '@domain/usecases/convert-currency';

function createFxRateRepoMock(): jest.Mocked<IFxRateRepository> {
  return {
    findRate: jest.fn(),
    findAllByBase: jest.fn(),
    findLatest: jest.fn(),
    saveRate: jest.fn(),
    saveBatch: jest.fn(),
    deleteStale: jest.fn(),
  };
}

const usdEurRate: FxRate = {
  id: 'fx-usd-eur',
  baseCurrency: 'USD',
  targetCurrency: 'EUR',
  rate: 0.85,
  fetchedAt: 1,
  createdAt: 1,
  updatedAt: 1,
};

describe('makeConvertCurrency', () => {
  it('returns the same amount when source and target currency match', async () => {
    const fxRateRepo = createFxRateRepoMock();
    const execute = makeConvertCurrency({fxRateRepo});

    const result = await execute(10_000, 'USD', 'usd');

    expect(result).toEqual({amountInCents: 10_000, currency: 'USD', rate: 1});
    expect(fxRateRepo.findRate).not.toHaveBeenCalled();
  });

  it('converts using a direct rate from the repository', async () => {
    const fxRateRepo = createFxRateRepoMock();
    fxRateRepo.findRate.mockImplementation(async (base, target) => {
      if (base === 'USD' && target === 'EUR') {
        return usdEurRate;
      }
      return null;
    });

    const execute = makeConvertCurrency({fxRateRepo});
    const result = await execute(10_000, 'USD', 'EUR');

    expect(result.currency).toBe('EUR');
    expect(result.rate).toBe(0.85);
    expect(result.amountInCents).toBe(8_500);
  });

  it('uses inverse lookup when the direct pair is missing', async () => {
    const fxRateRepo = createFxRateRepoMock();
    fxRateRepo.findRate.mockImplementation(async (base, target) => {
      if (base === 'EUR' && target === 'USD') {
        return null;
      }
      if (base === 'USD' && target === 'EUR') {
        return usdEurRate;
      }
      return null;
    });

    const execute = makeConvertCurrency({fxRateRepo});
    const result = await execute(8_500, 'EUR', 'USD');

    expect(fxRateRepo.findRate).toHaveBeenCalledWith('EUR', 'USD');
    expect(fxRateRepo.findRate).toHaveBeenCalledWith('USD', 'EUR');
    expect(result.currency).toBe('USD');
    expect(result.rate).toBeCloseTo(1 / 0.85, 10);
    expect(result.amountInCents).toBe(10_000);
  });

  it('throws when neither direct nor inverse rate exists', async () => {
    const fxRateRepo = createFxRateRepoMock();
    fxRateRepo.findRate.mockResolvedValue(null);

    const execute = makeConvertCurrency({fxRateRepo});

    await expect(execute(100, 'USD', 'JPY')).rejects.toThrow(
      'No exchange rate found for this currency pair',
    );
  });
});
