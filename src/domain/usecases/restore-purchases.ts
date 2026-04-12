import type {Tier} from '@domain/entities/Entitlement';
import type {IPurchaseService} from '@domain/repositories/IPurchaseService';

type Deps = {
  purchaseService: IPurchaseService;
};

export type RestorePurchasesResult = {
  tier: Tier;
  restored: boolean;
};

export class RestorePurchases {
  private purchaseService: IPurchaseService;

  constructor({purchaseService}: Deps) {
    this.purchaseService = purchaseService;
  }

  async execute(): Promise<RestorePurchasesResult> {
    const tier = await this.purchaseService.restorePurchases();
    return {
      tier,
      restored: tier !== 'free',
    };
  }
}
