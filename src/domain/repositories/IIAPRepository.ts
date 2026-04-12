export interface IIAPRepository {
  getPurchasedProducts(): Promise<string[]>;
  purchaseProduct(productId: string): Promise<boolean>;
  isProductOwned(productId: string): Promise<boolean>;
}
