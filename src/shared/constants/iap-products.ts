export type IAPCategory =
  | 'parser_pack'
  | 'report_template'
  | 'theme_pack'
  | 'icon_pack';

export type IAPProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
  category: IAPCategory;
  googlePlayId: string;
};

export const PARSER_PACKS: IAPProduct[] = [
  {
    id: 'parser_international',
    name: 'International Pack',
    description: 'Parsers for Wise, Revolut, and PayPal.',
    price: '$2.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.international',
  },
  {
    id: 'parser_african',
    name: 'African Pack',
    description: 'Parsers for Grey, Chipper Cash, M-Pesa, and Flutterwave.',
    price: '$2.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.african',
  },
  {
    id: 'parser_european',
    name: 'European Pack',
    description: 'Parsers for N26, Monzo, Bunq, and Dukascopy Bank.',
    price: '$2.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.european',
  },
  {
    id: 'parser_middleeast',
    name: 'Middle East Pack',
    description: 'Parsers for stc pay, Tabby, and Tamara.',
    price: '$1.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.middleeast',
  },
  {
    id: 'parser_asian',
    name: 'Asian Pack',
    description: 'Parsers for GCash, GrabPay, and Paytm.',
    price: '$1.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.asian',
  },
  {
    id: 'parser_latam',
    name: 'Latin America Pack',
    description: 'Parsers for Mercado Pago, Nubank, and PicPay.',
    price: '$1.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.latam',
  },
  {
    id: 'parser_us',
    name: 'US Pack',
    description: 'Parsers for Zelle, Venmo, Cash App, and Chase.',
    price: '$2.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.us',
  },
  {
    id: 'parser_crypto',
    name: 'Crypto Pack',
    description: 'Parsers for Binance, Coinbase, and Kraken.',
    price: '$1.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.crypto',
  },
  {
    id: 'parser_allbanks',
    name: 'All Banks Bundle',
    description: 'Every parser pack included. Best value.',
    price: '$9.99',
    category: 'parser_pack',
    googlePlayId: 'com.walletpulse.parser.allbanks',
  },
];

export const REPORT_TEMPLATES: IAPProduct[] = [
  {
    id: 'report_annual_summary',
    name: 'Annual Summary',
    description: 'A year-in-review report of your finances.',
    price: '$1.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.annual_summary',
  },
  {
    id: 'report_tax_prep',
    name: 'Tax Prep',
    description: 'Categorized expense summary for tax filing.',
    price: '$2.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.tax_prep',
  },
  {
    id: 'report_invoice_tracker',
    name: 'Invoice Tracker',
    description: 'Track invoices sent and received.',
    price: '$1.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.invoice_tracker',
  },
  {
    id: 'report_networth',
    name: 'Net Worth',
    description: 'Track your net worth over time across wallets.',
    price: '$1.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.networth',
  },
  {
    id: 'report_subscription_audit',
    name: 'Subscription Audit',
    description: 'Find subscriptions you forgot about.',
    price: '$0.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.subscription_audit',
  },
  {
    id: 'report_currency_impact',
    name: 'Currency Impact',
    description: 'See how exchange rates affected your spending.',
    price: '$1.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.currency_impact',
  },
  {
    id: 'report_bundle',
    name: 'Report Bundle',
    description: 'All report templates at a discount.',
    price: '$6.99',
    category: 'report_template',
    googlePlayId: 'com.walletpulse.report.bundle',
  },
];

export const THEME_PACKS: IAPProduct[] = [
  {
    id: 'theme_midnight_oled',
    name: 'Midnight OLED',
    description: 'Pure black theme for OLED screens.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.midnight_oled',
  },
  {
    id: 'theme_ocean_depth',
    name: 'Ocean Depth',
    description: 'Deep blue tones inspired by the ocean.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.ocean_depth',
  },
  {
    id: 'theme_forest',
    name: 'Forest',
    description: 'Earthy greens and natural tones.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.forest',
  },
  {
    id: 'theme_sunset',
    name: 'Sunset',
    description: 'Warm oranges and purples.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.sunset',
  },
  {
    id: 'theme_minimal_ink',
    name: 'Minimal Ink',
    description: 'Clean black and white with subtle grays.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.minimal_ink',
  },
  {
    id: 'theme_neon_finance',
    name: 'Neon Finance',
    description: 'Bold neon accents on dark backgrounds.',
    price: '$0.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.neon_finance',
  },
  {
    id: 'theme_all_themes',
    name: 'All Themes Bundle',
    description: 'Every theme pack included. Best value.',
    price: '$3.99',
    category: 'theme_pack',
    googlePlayId: 'com.walletpulse.theme.all_themes',
  },
];

export const ICON_PACKS: IAPProduct[] = [
  {
    id: 'icon_minimal_line',
    name: 'Minimal Line',
    description: 'Thin line icons for a clean look.',
    price: '$0.99',
    category: 'icon_pack',
    googlePlayId: 'com.walletpulse.icon.minimal_line',
  },
  {
    id: 'icon_filled_color',
    name: 'Filled Color',
    description: 'Bright filled icons with vivid colors.',
    price: '$0.99',
    category: 'icon_pack',
    googlePlayId: 'com.walletpulse.icon.filled_color',
  },
  {
    id: 'icon_emoji',
    name: 'Emoji',
    description: 'Use emoji as category icons.',
    price: '$0.99',
    category: 'icon_pack',
    googlePlayId: 'com.walletpulse.icon.emoji',
  },
  {
    id: 'icon_hand_drawn',
    name: 'Hand Drawn',
    description: 'Sketch-style hand drawn icons.',
    price: '$0.99',
    category: 'icon_pack',
    googlePlayId: 'com.walletpulse.icon.hand_drawn',
  },
  {
    id: 'icon_corporate',
    name: 'Corporate',
    description: 'Professional icons for business use.',
    price: '$0.99',
    category: 'icon_pack',
    googlePlayId: 'com.walletpulse.icon.corporate',
  },
];

export const IAP_PRODUCTS: IAPProduct[] = [
  ...PARSER_PACKS,
  ...REPORT_TEMPLATES,
  ...THEME_PACKS,
  ...ICON_PACKS,
];

export function getIAPProduct(id: string): IAPProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.id === id);
}

export function getProductsByCategory(category: IAPCategory): IAPProduct[] {
  return IAP_PRODUCTS.filter((p) => p.category === category);
}
