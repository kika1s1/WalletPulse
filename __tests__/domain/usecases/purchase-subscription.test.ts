import {PurchaseSubscription} from '@domain/usecases/purchase-subscription';
import type {
  IPurchaseService,
  PurchaseProductInfo,
} from '@domain/repositories/IPurchaseService';

const MOCK_PRODUCTS: PurchaseProductInfo[] = [
  {
    id: 'monthly',
    title: 'Monthly',
    description: 'Monthly plan',
    priceString: '$4.99',
    price: 4.99,
    currencyCode: 'USD',
  },
  {
    id: 'yearly',
    title: 'Yearly',
    description: 'Yearly plan',
    priceString: '$29.99',
    price: 29.99,
    currencyCode: 'USD',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    description: 'Lifetime plan',
    priceString: '$79.99',
    price: 79.99,
    currencyCode: 'USD',
  },
];

function buildMockService(
  overrides: Partial<IPurchaseService> = {},
): IPurchaseService {
  return {
    purchaseProduct: jest.fn().mockResolvedValue({
      success: true,
      tier: 'pro',
    }),
    getAvailableProducts: jest.fn().mockResolvedValue(MOCK_PRODUCTS),
    restorePurchases: jest.fn().mockResolvedValue('free'),
    ...overrides,
  };
}

describe('PurchaseSubscription use case', () => {
  describe('execute', () => {
    it('returns success and new tier on successful purchase', async () => {
      const service = buildMockService();
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('monthly');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('pro');
      expect(result.error).toBeUndefined();
      expect(service.purchaseProduct).toHaveBeenCalledWith('monthly');
    });

    it('returns lifetime tier on lifetime purchase', async () => {
      const service = buildMockService({
        purchaseProduct: jest.fn().mockResolvedValue({
          success: true,
          tier: 'lifetime',
        }),
      });
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('lifetime');

      expect(result.success).toBe(true);
      expect(result.tier).toBe('lifetime');
    });

    it('returns error when purchase fails', async () => {
      const service = buildMockService({
        purchaseProduct: jest.fn().mockResolvedValue({
          success: false,
          tier: 'free',
          error: 'Purchase cancelled.',
        }),
      });
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('monthly');

      expect(result.success).toBe(false);
      expect(result.tier).toBe('free');
      expect(result.error).toBe('Purchase cancelled.');
    });

    it('returns error for empty product ID', async () => {
      const service = buildMockService();
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product ID is required.');
      expect(service.purchaseProduct).not.toHaveBeenCalled();
    });

    it('returns error for whitespace-only product ID', async () => {
      const service = buildMockService();
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('   ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product ID is required.');
    });

    it('returns error when product is not in available products', async () => {
      const service = buildMockService();
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('unknown_product');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product is not available for purchase.');
      expect(service.purchaseProduct).not.toHaveBeenCalled();
    });

    it('calls getAvailableProducts before purchasing', async () => {
      const service = buildMockService();
      const useCase = new PurchaseSubscription({purchaseService: service});
      await useCase.execute('yearly');

      expect(service.getAvailableProducts).toHaveBeenCalledTimes(1);
      expect(service.purchaseProduct).toHaveBeenCalledWith('yearly');
    });

    it('does not call purchaseProduct when no products available', async () => {
      const service = buildMockService({
        getAvailableProducts: jest.fn().mockResolvedValue([]),
      });
      const useCase = new PurchaseSubscription({purchaseService: service});
      const result = await useCase.execute('monthly');

      expect(result.success).toBe(false);
      expect(service.purchaseProduct).not.toHaveBeenCalled();
    });
  });
});
