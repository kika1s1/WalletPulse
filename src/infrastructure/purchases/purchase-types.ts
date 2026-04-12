import type {CustomerInfo} from 'react-native-purchases';
import type {WalletPulsePlanId} from '@shared/constants/purchase-constants';

export type PurchaseProduct = {
  id: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode: string;
  pricePerMonthString: string | null;
  pricePerYearString: string | null;
};

export type PurchasePackage = {
  identifier: string;
  product: PurchaseProduct;
  packageType: string;
  planId: WalletPulsePlanId;
};

export type PurchaseOffering = {
  identifier: string;
  availablePackages: PurchasePackage[];
};

export type PurchaseResult =
  | {
      success: true;
      customerInfo: CustomerInfo | null;
      productId: string;
      transactionId: string | null;
      errorMessage: null;
    }
  | {
      success: false;
      customerInfo: CustomerInfo | null;
      productId: string | null;
      transactionId: null;
      errorMessage: string;
    };

export type PaywallPresentationResult = {
  success: boolean;
  purchased: boolean;
  restored: boolean;
  errorMessage: string | null;
  customerInfo: CustomerInfo | null;
};
