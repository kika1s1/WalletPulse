import {
  isNonEmptyString,
  isPositiveInteger,
  isNonNegativeInteger,
  isValidHexColor,
  isValidEmail,
  isValidISOCurrencyCode,
  clamp,
  isWithinRange,
} from '@shared/utils/validators';

describe('validators', () => {
  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' a ')).toBe(true);
    });

    it('returns false for empty or whitespace-only strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString('\t\n')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(0)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('returns true for positive integers', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(42)).toBe(true);
    });

    it('returns false for zero, negative numbers, floats, and non-numbers', () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-1)).toBe(false);
      expect(isPositiveInteger(1.5)).toBe(false);
      expect(isPositiveInteger(NaN)).toBe(false);
      expect(isPositiveInteger(Infinity)).toBe(false);
      expect(isPositiveInteger('1')).toBe(false);
    });
  });

  describe('isNonNegativeInteger', () => {
    it('returns true for zero and positive integers', () => {
      expect(isNonNegativeInteger(0)).toBe(true);
      expect(isNonNegativeInteger(100)).toBe(true);
    });

    it('returns false for negative numbers, floats, and non-numbers', () => {
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(0.5)).toBe(false);
    });
  });

  describe('isValidHexColor', () => {
    it('returns true for 3 and 6 digit hex colors with a hash prefix', () => {
      expect(isValidHexColor('#FFF')).toBe(true);
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('#FFFFFF')).toBe(true);
      expect(isValidHexColor('#a1B2c3')).toBe(true);
    });

    it('returns false for invalid hex color strings', () => {
      expect(isValidHexColor('FFF')).toBe(false);
      expect(isValidHexColor('#FF')).toBe(false);
      expect(isValidHexColor('#GGG')).toBe(false);
      expect(isValidHexColor('#FFFFFFF')).toBe(false);
      expect(isValidHexColor('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('returns true for basic valid email shapes', () => {
      expect(isValidEmail('a@b.co')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
    });

    it('returns false for invalid email strings', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('spaces in@mail.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidISOCurrencyCode', () => {
    it('returns true for three-letter codes', () => {
      expect(isValidISOCurrencyCode('USD')).toBe(true);
      expect(isValidISOCurrencyCode('eur')).toBe(true);
      expect(isValidISOCurrencyCode(' ETB ')).toBe(true);
    });

    it('returns false for invalid lengths or characters', () => {
      expect(isValidISOCurrencyCode('US')).toBe(false);
      expect(isValidISOCurrencyCode('USDD')).toBe(false);
      expect(isValidISOCurrencyCode('US1')).toBe(false);
      expect(isValidISOCurrencyCode('')).toBe(false);
    });
  });

  describe('clamp', () => {
    it('returns value when inside the range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('returns min when value is below min', () => {
      expect(clamp(-3, 0, 10)).toBe(0);
    });

    it('returns max when value is above max', () => {
      expect(clamp(99, 0, 10)).toBe(10);
    });
  });

  describe('isWithinRange', () => {
    it('returns true when value is between min and max inclusive', () => {
      expect(isWithinRange(5, 0, 10)).toBe(true);
      expect(isWithinRange(0, 0, 10)).toBe(true);
      expect(isWithinRange(10, 0, 10)).toBe(true);
    });

    it('returns false when value is outside the range', () => {
      expect(isWithinRange(-1, 0, 10)).toBe(false);
      expect(isWithinRange(11, 0, 10)).toBe(false);
    });
  });
});
