import {
  createCurrency,
  isValidCurrencyCode,
  formatCurrencySymbol,
  SUPPORTED_CURRENCIES,
} from '@domain/value-objects/Currency';

describe('Currency value object', () => {
  describe('createCurrency', () => {
    it('should create a valid currency', () => {
      const currency = createCurrency('USD');
      expect(currency.code).toBe('USD');
      expect(currency.name).toBe('US Dollar');
      expect(currency.symbol).toBe('$');
      expect(currency.decimals).toBe(2);
    });

    it('should normalize lowercase codes', () => {
      const currency = createCurrency('eur');
      expect(currency.code).toBe('EUR');
    });

    it('should support Ethiopian Birr', () => {
      const currency = createCurrency('ETB');
      expect(currency.code).toBe('ETB');
      expect(currency.name).toBe('Ethiopian Birr');
      expect(currency.symbol).toBe('Br');
    });

    it('should throw for invalid codes', () => {
      expect(() => createCurrency('XX')).toThrow();
      expect(() => createCurrency('')).toThrow();
      expect(() => createCurrency('USDD')).toThrow();
    });

    it('should handle zero-decimal currencies (JPY)', () => {
      const currency = createCurrency('JPY');
      expect(currency.decimals).toBe(0);
    });
  });

  describe('isValidCurrencyCode', () => {
    it('should return true for supported codes', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('EUR')).toBe(true);
      expect(isValidCurrencyCode('ETB')).toBe(true);
    });

    it('should return false for unsupported codes', () => {
      expect(isValidCurrencyCode('ZZZ')).toBe(false);
      expect(isValidCurrencyCode('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidCurrencyCode('usd')).toBe(true);
    });
  });

  describe('formatCurrencySymbol', () => {
    it('should format with symbol and code', () => {
      expect(formatCurrencySymbol('USD', 150000)).toBe('$1,500.00 USD');
    });

    it('should format negative amounts', () => {
      expect(formatCurrencySymbol('USD', -25050)).toBe('-$250.50 USD');
    });

    it('should format zero-decimal currencies', () => {
      expect(formatCurrencySymbol('JPY', 1500)).toBe('\u00a51,500 JPY');
    });

    it('should format ETB correctly', () => {
      expect(formatCurrencySymbol('ETB', 250000)).toBe('Br2,500.00 ETB');
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should contain at least 30 major currencies', () => {
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(30);
    });

    it('should have unique codes', () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });
});
