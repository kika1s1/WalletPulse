import Config from 'react-native-config';

export const REVENUECAT_API_KEY = Config.REVENUECAT_API_KEY ?? '';

export const REVENUECAT_OFFERING_IDS = {
  DEFAULT: 'default',
} as const;

export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',

  PRO_MONTHLY: 'monthly',
  PRO_ANNUAL: 'yearly',
  LIFETIME_PRO: 'lifetime',
  BUSINESS_MONTHLY: 'walletpulse_business_monthly',
  BUSINESS_ANNUAL: 'walletpulse_business_annual',
} as const;

export const ENTITLEMENT_IDS = {
  WALLETPULSE_PRO: 'Walletpulse Pro',

  // Backwards-compatible aliases for the existing entitlement code.
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
