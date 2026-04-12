import type {Tier} from '@domain/entities/Entitlement';
import type {
  DomainPurchaseResult,
  IPurchaseService,
  PurchaseProductInfo,
} from '@domain/repositories/IPurchaseService';
import {mapCustomerInfoToTier} from './entitlement-map';
import type {PurchasePackage} from './purchase-types';
import {purchaseService} from './PurchaseService';

function mapPackageToProductInfo(pkg: PurchasePackage): PurchaseProductInfo {
  return {
    id: pkg.product.id,
    title: pkg.product.title,
    description: pkg.product.description,
    priceString: pkg.product.priceString,
    price: pkg.product.price,
    currencyCode: pkg.product.currencyCode,
  };
}

function planIdFromProductId(
  productId: string,
): 'monthly' | 'yearly' | 'lifetime' | null {
  if (productId === 'monthly') {
    return 'monthly';
  }
  if (productId === 'yearly') {
    return 'yearly';
  }
  if (productId === 'lifetime') {
    return 'lifetime';
  }
  return null;
}

export class PurchaseServiceAdapter implements IPurchaseService {
  async purchaseProduct(productId: string): Promise<DomainPurchaseResult> {
    const planId = planIdFromProductId(productId);
    if (!planId) {
      return {
        success: false,
        tier: 'free',
        error: 'Unknown product ID.',
      };
    }

    const result = await purchaseService.purchasePlan(planId);

    if (!result.success) {
      return {
        success: false,
        tier: mapCustomerInfoToTier(result.customerInfo),
        error: result.errorMessage ?? 'Purchase failed.',
      };
    }

    return {
      success: true,
      tier: mapCustomerInfoToTier(result.customerInfo),
    };
  }

  async getAvailableProducts(): Promise<PurchaseProductInfo[]> {
    const offering = await purchaseService.getOffering();
    if (!offering) {
      return [];
    }

    return offering.availablePackages.map(mapPackageToProductInfo);
  }

  async restorePurchases(): Promise<Tier> {
    const result = await purchaseService.restore();
    return mapCustomerInfoToTier(result.customerInfo);
  }
}

export const purchaseServiceAdapter = new PurchaseServiceAdapter();
