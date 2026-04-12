import Config from 'react-native-config';

export const REVENUECAT_API_KEY = Config.REVENUECAT_API_KEY ?? '';

export const REVENUECAT_OFFERING_IDS = {
  DEFAULT: 'default',
} as const;

export const PRODUCT_IDS = {
  MONTHLY: 'walletpulse_pro_monthly',
  YEARLY: 'walletpulse_pro_yearly',
  LIFETIME: 'walletpulse_pro_lifetime',

  PRO_MONTHLY: 'walletpulse_pro_monthly',
  PRO_ANNUAL: 'walletpulse_pro_yearly',
  LIFETIME_PRO: 'walletpulse_pro_lifetime',
  BUSINESS_MONTHLY: 'walletpulse_business_monthly',
  BUSINESS_ANNUAL: 'walletpulse_business_annual',
} as const;

export const ENTITLEMENT_IDS = {
  WALLETPULSE_PRO: 'Walletpulse Pro',

  PRO: 'Walletpulse Pro',
  BUSINESS: 'Walletpulse Business',
} as const;

export const PLAN_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
} as const;

export type WalletPulsePlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];

export const PLAN_LABELS: Record<WalletPulsePlanId, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
};

export const WEB_PURCHASE_LINK_ID = Config.WEB_PURCHASE_LINK_ID ?? '';

export const WEB_PURCHASE_BASE_URL = 'https://pay.rev.cat';

export const PLAN_PRICES: Record<WalletPulsePlanId, {amount: string; period: string}> = {
  monthly: {amount: '$4.99', period: '/ month'},
  yearly: {amount: '$39.99', period: '/ year'},
  lifetime: {amount: '$79.99', period: 'one time'},
};

export const APP_DEEP_LINK_SCHEME = 'walletpulse';
