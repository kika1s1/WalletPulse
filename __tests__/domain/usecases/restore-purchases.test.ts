import {RestorePurchases} from '@domain/usecases/restore-purchases';
import type {IPurchaseService} from '@domain/repositories/IPurchaseService';

function buildMockService(
  overrides: Partial<IPurchaseService> = {},
): IPurchaseService {
  return {
    purchaseProduct: jest.fn().mockResolvedValue({
      success: true,
      tier: 'pro',
    }),
    getAvailableProducts: jest.fn().mockResolvedValue([]),
    restorePurchases: jest.fn().mockResolvedValue('free'),
    ...overrides,
  };
}

describe('RestorePurchases use case', () => {
  describe('execute', () => {
    it('returns restored true when previous subscription found', async () => {
      const service = buildMockService({
        restorePurchases: jest.fn().mockResolvedValue('pro'),
      });
      const useCase = new RestorePurchases({purchaseService: service});
      const result = await useCase.execute();

      expect(result.tier).toBe('pro');
      expect(result.restored).toBe(true);
    });

    it('returns restored true for lifetime tier', async () => {
      const service = buildMockService({
        restorePurchases: jest.fn().mockResolvedValue('lifetime'),
      });
      const useCase = new RestorePurchases({purchaseService: service});
      const result = await useCase.execute();

      expect(result.tier).toBe('lifetime');
      expect(result.restored).toBe(true);
    });

    it('returns restored true for business tier', async () => {
      const service = buildMockService({
        restorePurchases: jest.fn().mockResolvedValue('business'),
      });
      const useCase = new RestorePurchases({purchaseService: service});
      const result = await useCase.execute();

      expect(result.tier).toBe('business');
      expect(result.restored).toBe(true);
    });

    it('returns restored false when no subscription found', async () => {
      const service = buildMockService({
        restorePurchases: jest.fn().mockResolvedValue('free'),
      });
      const useCase = new RestorePurchases({purchaseService: service});
      const result = await useCase.execute();

      expect(result.tier).toBe('free');
      expect(result.restored).toBe(false);
    });

    it('calls restorePurchases on the service', async () => {
      const service = buildMockService();
      const useCase = new RestorePurchases({purchaseService: service});
      await useCase.execute();

      expect(service.restorePurchases).toHaveBeenCalledTimes(1);
    });
  });
});
