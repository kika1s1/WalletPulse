import type {FxRate} from '@domain/entities/FxRate';
import type {IFxRateRepository} from '@domain/repositories/IFxRateRepository';
import type {FxApiResponse} from '@data/datasources/RemoteDataSource';

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

const mockSuccessResponse: FxApiResponse = {
  result: 'success',
  base_code: 'USD',
  conversion_rates: {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    ETB: 55.5,
    NGN: 750.0,
    JPY: 110.5,
  },
  time_last_update_utc: 'Mon, 01 Jan 2024 00:00:01 +0000',
};

describe('FxService', () => {
  describe('fetchAndCacheRates', () => {
    it('should fetch rates from API and save them to the repository', async () => {
      const repo = createFxRateRepoMock();
      repo.deleteStale.mockResolvedValue(undefined);
      repo.saveBatch.mockResolvedValue(undefined);

      const mockFetch = jest
        .fn()
        .mockResolvedValue(mockSuccessResponse);

      const {makeFetchAndCacheRates} = require('@infrastructure/fx-service');
      const execute = makeFetchAndCacheRates({
        fxRateRepo: repo,
        fetchRates: mockFetch,
      });

      await execute('test-api-key', 'USD');

      expect(mockFetch).toHaveBeenCalledWith('test-api-key', 'USD');
      expect(repo.deleteStale).toHaveBeenCalled();
      expect(repo.saveBatch).toHaveBeenCalled();

      const savedRates: FxRate[] = repo.saveBatch.mock.calls[0][0];
      expect(savedRates.length).toBe(5);
      expect(savedRates.every((r) => r.baseCurrency === 'USD')).toBe(true);

      const eurRate = savedRates.find((r) => r.targetCurrency === 'EUR');
      expect(eurRate?.rate).toBe(0.85);

      const gbpRate = savedRates.find((r) => r.targetCurrency === 'GBP');
      expect(gbpRate?.rate).toBe(0.73);
    });

    it('should skip the base currency itself', async () => {
      const repo = createFxRateRepoMock();
      repo.deleteStale.mockResolvedValue(undefined);
      repo.saveBatch.mockResolvedValue(undefined);

      const mockFetch = jest.fn().mockResolvedValue(mockSuccessResponse);

      const {makeFetchAndCacheRates} = require('@infrastructure/fx-service');
      const execute = makeFetchAndCacheRates({
        fxRateRepo: repo,
        fetchRates: mockFetch,
      });

      await execute('key', 'USD');

      const savedRates: FxRate[] = repo.saveBatch.mock.calls[0][0];
      const selfRate = savedRates.find((r) => r.targetCurrency === 'USD');
      expect(selfRate).toBeUndefined();
    });

    it('should delete stale rates older than 24 hours', async () => {
      const repo = createFxRateRepoMock();
      repo.deleteStale.mockResolvedValue(undefined);
      repo.saveBatch.mockResolvedValue(undefined);

      const mockFetch = jest.fn().mockResolvedValue(mockSuccessResponse);

      const {makeFetchAndCacheRates, STALE_THRESHOLD_MS} = require('@infrastructure/fx-service');
      const execute = makeFetchAndCacheRates({
        fxRateRepo: repo,
        fetchRates: mockFetch,
      });

      await execute('key', 'USD');

      expect(repo.deleteStale).toHaveBeenCalledWith(STALE_THRESHOLD_MS);
    });

    it('should propagate API errors', async () => {
      const repo = createFxRateRepoMock();
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const {makeFetchAndCacheRates} = require('@infrastructure/fx-service');
      const execute = makeFetchAndCacheRates({
        fxRateRepo: repo,
        fetchRates: mockFetch,
      });

      await expect(execute('key', 'USD')).rejects.toThrow('Network error');
      expect(repo.saveBatch).not.toHaveBeenCalled();
    });
  });

  describe('getConversionRate', () => {
    it('should return 1 for same currency', async () => {
      const repo = createFxRateRepoMock();

      const {makeGetConversionRate} = require('@infrastructure/fx-service');
      const getRate = makeGetConversionRate({fxRateRepo: repo});

      const rate = await getRate('USD', 'USD');

      expect(rate).toBe(1);
      expect(repo.findRate).not.toHaveBeenCalled();
    });

    it('should return direct rate when available', async () => {
      const repo = createFxRateRepoMock();
      repo.findRate.mockResolvedValue({
        id: 'fx-1',
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.85,
        fetchedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const {makeGetConversionRate} = require('@infrastructure/fx-service');
      const getRate = makeGetConversionRate({fxRateRepo: repo});

      const rate = await getRate('USD', 'EUR');

      expect(rate).toBe(0.85);
    });

    it('should compute inverse when direct rate is missing', async () => {
      const repo = createFxRateRepoMock();
      repo.findRate.mockImplementation(async (base: string, target: string) => {
        if (base === 'EUR' && target === 'USD') {
          return null;
        }
        if (base === 'USD' && target === 'EUR') {
          return {
            id: 'fx-2',
            baseCurrency: 'USD',
            targetCurrency: 'EUR',
            rate: 0.85,
            fetchedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
        return null;
      });

      const {makeGetConversionRate} = require('@infrastructure/fx-service');
      const getRate = makeGetConversionRate({fxRateRepo: repo});

      const rate = await getRate('EUR', 'USD');

      expect(rate).toBeCloseTo(1 / 0.85, 6);
    });

    it('should cross through base currency when no direct or inverse pair', async () => {
      const repo = createFxRateRepoMock();
      repo.findRate.mockResolvedValue(null);
      repo.findAllByBase.mockImplementation(async (base: string) => {
        if (base === 'USD') {
          return [
            {
              id: 'fx-eur',
              baseCurrency: 'USD',
              targetCurrency: 'EUR',
              rate: 0.85,
              fetchedAt: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              id: 'fx-gbp',
              baseCurrency: 'USD',
              targetCurrency: 'GBP',
              rate: 0.73,
              fetchedAt: Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
        }
        return [];
      });

      const {makeGetConversionRate} = require('@infrastructure/fx-service');
      const getRate = makeGetConversionRate({fxRateRepo: repo});

      const rate = await getRate('EUR', 'GBP');

      expect(rate).toBeCloseTo(0.73 / 0.85, 6);
    });

    it('should return null when no rate path exists', async () => {
      const repo = createFxRateRepoMock();
      repo.findRate.mockResolvedValue(null);
      repo.findAllByBase.mockResolvedValue([]);

      const {makeGetConversionRate} = require('@infrastructure/fx-service');
      const getRate = makeGetConversionRate({fxRateRepo: repo});

      const rate = await getRate('XYZ', 'ABC');

      expect(rate).toBeNull();
    });
  });

  describe('convertAmount', () => {
    it('should convert cents using the rate', () => {
      const {convertAmountCents} = require('@infrastructure/fx-service');

      expect(convertAmountCents(10_000, 0.85)).toBe(8_500);
      expect(convertAmountCents(1_00, 110.5)).toBe(11_050);
    });

    it('should round to the nearest cent', () => {
      const {convertAmountCents} = require('@infrastructure/fx-service');

      expect(convertAmountCents(333, 0.85)).toBe(283);
    });
  });
});
