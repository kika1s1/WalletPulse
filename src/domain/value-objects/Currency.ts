export type Currency = {
  readonly code: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly flag?: string;
};

type CurrencyDefinition = Omit<Currency, 'code'>;

const CURRENCY_MAP: Record<string, CurrencyDefinition> = {
  USD: {name: 'US Dollar', symbol: '$', decimals: 2, flag: '🇺🇸'},
  EUR: {name: 'Euro', symbol: '€', decimals: 2, flag: '🇪🇺'},
  GBP: {name: 'British Pound', symbol: '£', decimals: 2, flag: '🇬🇧'},
  JPY: {name: 'Japanese Yen', symbol: '\u00a5', decimals: 0, flag: '🇯🇵'},
  CHF: {name: 'Swiss Franc', symbol: 'CHF', decimals: 2, flag: '🇨🇭'},
  CAD: {name: 'Canadian Dollar', symbol: 'C$', decimals: 2, flag: '🇨🇦'},
  AUD: {name: 'Australian Dollar', symbol: 'A$', decimals: 2, flag: '🇦🇺'},
  NZD: {name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, flag: '🇳🇿'},
  CNY: {name: 'Chinese Yuan', symbol: '¥', decimals: 2, flag: '🇨🇳'},
  INR: {name: 'Indian Rupee', symbol: '₹', decimals: 2, flag: '🇮🇳'},
  KRW: {name: 'South Korean Won', symbol: '₩', decimals: 0, flag: '🇰🇷'},
  SGD: {name: 'Singapore Dollar', symbol: 'S$', decimals: 2, flag: '🇸🇬'},
  HKD: {name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, flag: '🇭🇰'},
  SEK: {name: 'Swedish Krona', symbol: 'kr', decimals: 2, flag: '🇸🇪'},
  NOK: {name: 'Norwegian Krone', symbol: 'kr', decimals: 2, flag: '🇳🇴'},
  DKK: {name: 'Danish Krone', symbol: 'kr', decimals: 2, flag: '🇩🇰'},
  PLN: {name: 'Polish Zloty', symbol: 'zł', decimals: 2, flag: '🇵🇱'},
  CZK: {name: 'Czech Koruna', symbol: 'Kč', decimals: 2, flag: '🇨🇿'},
  HUF: {name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, flag: '🇭🇺'},
  TRY: {name: 'Turkish Lira', symbol: '₺', decimals: 2, flag: '🇹🇷'},
  BRL: {name: 'Brazilian Real', symbol: 'R$', decimals: 2, flag: '🇧🇷'},
  MXN: {name: 'Mexican Peso', symbol: 'MX$', decimals: 2, flag: '🇲🇽'},
  ARS: {name: 'Argentine Peso', symbol: 'AR$', decimals: 2, flag: '🇦🇷'},
  CLP: {name: 'Chilean Peso', symbol: 'CL$', decimals: 0, flag: '🇨🇱'},
  COP: {name: 'Colombian Peso', symbol: 'CO$', decimals: 0, flag: '🇨🇴'},
  ZAR: {name: 'South African Rand', symbol: 'R', decimals: 2, flag: '🇿🇦'},
  NGN: {name: 'Nigerian Naira', symbol: '₦', decimals: 2, flag: '🇳🇬'},
  KES: {name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, flag: '🇰🇪'},
  GHS: {name: 'Ghanaian Cedi', symbol: 'GH₵', decimals: 2, flag: '🇬🇭'},
  ETB: {name: 'Ethiopian Birr', symbol: 'Br', decimals: 2, flag: '🇪🇹'},
  EGP: {name: 'Egyptian Pound', symbol: 'E£', decimals: 2, flag: '🇪🇬'},
  MAD: {name: 'Moroccan Dirham', symbol: 'MAD', decimals: 2, flag: '🇲🇦'},
  TZS: {name: 'Tanzanian Shilling', symbol: 'TSh', decimals: 0, flag: '🇹🇿'},
  UGX: {name: 'Ugandan Shilling', symbol: 'USh', decimals: 0, flag: '🇺🇬'},
  RWF: {name: 'Rwandan Franc', symbol: 'FRw', decimals: 0, flag: '🇷🇼'},
  AED: {name: 'UAE Dirham', symbol: 'AED', decimals: 2, flag: '🇦🇪'},
  SAR: {name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, flag: '🇸🇦'},
  ILS: {name: 'Israeli Shekel', symbol: '₪', decimals: 2, flag: '🇮🇱'},
  THB: {name: 'Thai Baht', symbol: '฿', decimals: 2, flag: '🇹🇭'},
  MYR: {name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, flag: '🇲🇾'},
  IDR: {name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, flag: '🇮🇩'},
  PHP: {name: 'Philippine Peso', symbol: '₱', decimals: 2, flag: '🇵🇭'},
  VND: {name: 'Vietnamese Dong', symbol: '₫', decimals: 0, flag: '🇻🇳'},
  TWD: {name: 'Taiwan Dollar', symbol: 'NT$', decimals: 0, flag: '🇹🇼'},
  PKR: {name: 'Pakistani Rupee', symbol: 'Rs', decimals: 2, flag: '🇵🇰'},
  BDT: {name: 'Bangladeshi Taka', symbol: '৳', decimals: 2, flag: '🇧🇩'},
  RUB: {name: 'Russian Ruble', symbol: '₽', decimals: 2, flag: '🇷🇺'},
  UAH: {name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, flag: '🇺🇦'},
  RON: {name: 'Romanian Leu', symbol: 'lei', decimals: 2, flag: '🇷🇴'},
  BGN: {name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, flag: '🇧🇬'},
};

export const SUPPORTED_CURRENCIES: Currency[] = Object.entries(CURRENCY_MAP).map(
  ([code, def]) => ({code, ...def}),
);

export function createCurrency(code: string): Currency {
  const normalized = code.toUpperCase().trim();
  const definition = CURRENCY_MAP[normalized];
  if (!definition) {
    throw new Error(`Unsupported currency code: "${code}"`);
  }
  return {code: normalized, ...definition};
}

export function isValidCurrencyCode(code: string): boolean {
  return code.toUpperCase().trim() in CURRENCY_MAP;
}

function formatNumber(amount: number, decimals: number): string {
  const abs = Math.abs(amount);
  const fixed = decimals > 0 ? abs.toFixed(decimals) : Math.round(abs).toString();
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}

export function formatCurrencySymbol(code: string, amountInCents: number): string {
  const currency = createCurrency(code);
  const divisor = currency.decimals > 0 ? Math.pow(10, currency.decimals) : 1;
  const majorAmount = amountInCents / divisor;
  const sign = amountInCents < 0 ? '-' : '';
  const formatted = formatNumber(majorAmount, currency.decimals);
  return `${sign}${currency.symbol}${formatted}`;
}
