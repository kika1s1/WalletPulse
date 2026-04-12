export type AffiliateCategory = 'banking' | 'accounting' | 'crypto';

export type AffiliatePartner = {
  id: string;
  name: string;
  description: string;
  referralUrl: string;
  icon: string;
  category: AffiliateCategory;
  contextTrigger: string;
};

export const AFFILIATE_PARTNERS: AffiliatePartner[] = [
  {
    id: 'wise',
    name: 'Wise',
    description: 'Send and receive money internationally with low fees.',
    referralUrl: 'https://wise.com/invite/',
    icon: 'swap-horizontal-circle',
    category: 'banking',
    contextTrigger: 'high_fx_fees',
  },
  {
    id: 'revolut',
    name: 'Revolut',
    description: 'Manage your money across currencies in one app.',
    referralUrl: 'https://revolut.com/referral/',
    icon: 'credit-card-outline',
    category: 'banking',
    contextTrigger: 'multi_currency',
  },
  {
    id: 'grey',
    name: 'Grey',
    description: 'Receive USD, GBP, and EUR payments in Africa.',
    referralUrl: 'https://grey.co/referral/',
    icon: 'bank-outline',
    category: 'banking',
    contextTrigger: 'africa_region',
  },
  {
    id: 'payoneer',
    name: 'Payoneer',
    description: 'Get paid globally with competitive rates.',
    referralUrl: 'https://payoneer.com/referral/',
    icon: 'cash-multiple',
    category: 'banking',
    contextTrigger: 'freelancer_income',
  },
  {
    id: 'binance',
    name: 'Binance',
    description: 'Buy, sell, and trade cryptocurrency.',
    referralUrl: 'https://binance.com/referral/',
    icon: 'bitcoin',
    category: 'crypto',
    contextTrigger: 'crypto_transactions',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting software for small businesses.',
    referralUrl: 'https://quickbooks.intuit.com/referral/',
    icon: 'calculator-variant',
    category: 'accounting',
    contextTrigger: 'business_expenses',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Free invoicing and accounting for entrepreneurs.',
    referralUrl: 'https://www.waveapps.com/referral/',
    icon: 'file-document-outline',
    category: 'accounting',
    contextTrigger: 'invoicing_needed',
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Simple cloud accounting built for business owners.',
    referralUrl: 'https://freshbooks.com/referral/',
    icon: 'book-open-variant',
    category: 'accounting',
    contextTrigger: 'accounting_needed',
  },
];

export function getPartnerById(id: string): AffiliatePartner | undefined {
  return AFFILIATE_PARTNERS.find((p) => p.id === id);
}
