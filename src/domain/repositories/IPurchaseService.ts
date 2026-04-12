import type {Tier} from '@domain/entities/Entitlement';

export type PurchaseProductInfo = {
  id: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode: string;
};

export type DomainPurchaseResult = {
  success: boolean;
  tier: Tier;
  error?: string;
};

export interface IPurchaseService {
  purchaseProduct(productId: string): Promise<DomainPurchaseResult>;
  getAvailableProducts(): Promise<PurchaseProductInfo[]>;
  restorePurchases(): Promise<Tier>;
}
