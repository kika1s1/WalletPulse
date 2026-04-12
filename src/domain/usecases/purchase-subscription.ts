import type {Tier} from '@domain/entities/Entitlement';
import type {IPurchaseService} from '@domain/repositories/IPurchaseService';

type Deps = {
  purchaseService: IPurchaseService;
};

export type PurchaseSubscriptionResult = {
  success: boolean;
  tier: Tier;
  error?: string;
};

export class PurchaseSubscription {
  private purchaseService: IPurchaseService;

  constructor({purchaseService}: Deps) {
    this.purchaseService = purchaseService;
  }

  async execute(productId: string): Promise<PurchaseSubscriptionResult> {
    if (!productId.trim()) {
      return {success: false, tier: 'free', error: 'Product ID is required.'};
    }

    const products = await this.purchaseService.getAvailableProducts();
    const found = products.some((p) => p.id === productId);

    if (!found) {
      return {
        success: false,
        tier: 'free',
        error: 'Product is not available for purchase.',
      };
    }

    return this.purchaseService.purchaseProduct(productId);
  }
}
