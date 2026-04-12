import {IAPRepository} from '@data/repositories/IAPRepository';
import {IAP_PRODUCTS, PARSER_PACKS, THEME_PACKS} from '@shared/constants/iap-products';

const mockGetCustomerInfo = jest.fn();
const mockPurchaseProduct = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getCustomerInfo: () => mockGetCustomerInfo(),
    purchaseProduct: (id: string) => mockPurchaseProduct(id),
  },
}));

function fakeCustomerInfo(overrides: {
  active?: Record<string, {isActive: boolean; productIdentifier?: string}>;
  allPurchased?: string[];
  activeSubscriptions?: string[];
}) {
  return {
    entitlements: {
      active: overrides.active ?? {},
    },
    allPurchasedProductIdentifiers: overrides.allPurchased ?? [],
    activeSubscriptions: overrides.activeSubscriptions ?? [],
  };
}

describe('IAPRepository', () => {
  const repo = new IAPRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isProductOwned', () => {
    it('returns false for a non-purchased product (free user)', async () => {
      mockGetCustomerInfo.mockResolvedValue(fakeCustomerInfo({}));

      const owned = await repo.isProductOwned('parser_international');
      expect(owned).toBe(false);
    });

    it('returns true when the product was directly purchased', async () => {
      mockGetCustomerInfo.mockResolvedValue(
        fakeCustomerInfo({
          allPurchased: ['com.walletpulse.parser.international'],
        }),
      );

      const owned = await repo.isProductOwned('parser_international');
      expect(owned).toBe(true);
    });
  });

  describe('getPurchasedProducts for Pro subscriber', () => {
    it('includes all parser packs and theme packs', async () => {
      mockGetCustomerInfo.mockResolvedValue(
        fakeCustomerInfo({
          active: {
            'Walletpulse Pro': {isActive: true, productIdentifier: 'monthly'},
          },
          activeSubscriptions: ['monthly'],
        }),
      );

      const owned = await repo.getPurchasedProducts();

      for (const pack of PARSER_PACKS) {
        expect(owned).toContain(pack.id);
      }
      for (const theme of THEME_PACKS) {
        expect(owned).toContain(theme.id);
      }
    });

    it('does not include report templates or icon packs automatically', async () => {
      mockGetCustomerInfo.mockResolvedValue(
        fakeCustomerInfo({
          active: {
            'Walletpulse Pro': {isActive: true, productIdentifier: 'monthly'},
          },
          activeSubscriptions: ['monthly'],
        }),
      );

      const owned = await repo.getPurchasedProducts();
      const reportIds = IAP_PRODUCTS.filter(
        (p) => p.category === 'report_template',
      ).map((p) => p.id);
      const iconIds = IAP_PRODUCTS.filter(
        (p) => p.category === 'icon_pack',
      ).map((p) => p.id);

      for (const rid of reportIds) {
        expect(owned).not.toContain(rid);
      }
      for (const iid of iconIds) {
        expect(owned).not.toContain(iid);
      }
    });
  });

  describe('purchaseProduct', () => {
    it('returns true on successful purchase', async () => {
      mockPurchaseProduct.mockResolvedValue({});

      const result = await repo.purchaseProduct('parser_international');
      expect(result).toBe(true);
      expect(mockPurchaseProduct).toHaveBeenCalledWith(
        'com.walletpulse.parser.international',
      );
    });

    it('returns false on purchase failure', async () => {
      mockPurchaseProduct.mockRejectedValue(new Error('User cancelled'));

      const result = await repo.purchaseProduct('parser_international');
      expect(result).toBe(false);
    });

    it('returns false for unknown product ID', async () => {
      const result = await repo.purchaseProduct('nonexistent_product');
      expect(result).toBe(false);
      expect(mockPurchaseProduct).not.toHaveBeenCalled();
    });
  });

  describe('getPurchasedProducts for free user', () => {
    it('returns empty array when nothing is purchased', async () => {
      mockGetCustomerInfo.mockResolvedValue(fakeCustomerInfo({}));

      const owned = await repo.getPurchasedProducts();
      expect(owned).toHaveLength(0);
    });

    it('returns only directly purchased products', async () => {
      mockGetCustomerInfo.mockResolvedValue(
        fakeCustomerInfo({
          allPurchased: [
            'com.walletpulse.parser.crypto',
            'com.walletpulse.theme.forest',
          ],
        }),
      );

      const owned = await repo.getPurchasedProducts();
      expect(owned).toContain('parser_crypto');
      expect(owned).toContain('theme_forest');
      expect(owned).toHaveLength(2);
    });
  });
});
