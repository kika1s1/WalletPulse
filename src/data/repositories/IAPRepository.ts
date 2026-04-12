import Purchases from 'react-native-purchases';
import type {IIAPRepository} from '@domain/repositories/IIAPRepository';
import {IAP_PRODUCTS} from '@shared/constants/iap-products';
import {mapCustomerInfoToTier} from '@infrastructure/purchases/entitlement-map';

function isSubscriberTier(tier: string): boolean {
  return tier === 'pro' || tier === 'business' || tier === 'lifetime';
}

function isParserOrTheme(productId: string): boolean {
  return productId.startsWith('parser_') || productId.startsWith('theme_');
}

export class IAPRepository implements IIAPRepository {
  async getPurchasedProducts(): Promise<string[]> {
    const info = await Purchases.getCustomerInfo();
    const tier = mapCustomerInfoToTier(info);

    const owned: string[] = [];

    if (isSubscriberTier(tier)) {
      for (const product of IAP_PRODUCTS) {
        if (isParserOrTheme(product.id)) {
          owned.push(product.id);
        }
      }
    }

    for (const productId of info.allPurchasedProductIdentifiers) {
      const match = IAP_PRODUCTS.find(
        (p) => p.googlePlayId === productId || p.id === productId,
      );
      if (match && !owned.includes(match.id)) {
        owned.push(match.id);
      }
    }

    return owned;
  }

  async purchaseProduct(productId: string): Promise<boolean> {
    const product = IAP_PRODUCTS.find(
      (p) => p.id === productId || p.googlePlayId === productId,
    );
    if (!product) {
      return false;
    }

    try {
      await Purchases.purchaseProduct(product.googlePlayId);
      return true;
    } catch {
      return false;
    }
  }

  async isProductOwned(productId: string): Promise<boolean> {
    const owned = await this.getPurchasedProducts();
    return owned.includes(productId);
  }
}

export const iapRepository = new IAPRepository();
