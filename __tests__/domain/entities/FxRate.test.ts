import {convert, createFxRate, getInverseRate, isStale} from '@domain/entities/FxRate';

const HOUR_MS = 3_600_000;

const baseInput = {
  id: 'fx-1',
  baseCurrency: 'USD',
  targetCurrency: 'EUR',
  rate: 0.85,
  fetchedAt: 1_700_000_000_000,
  createdAt: 1,
  updatedAt: 1,
};

describe('FxRate entity', () => {
  describe('createFxRate', () => {
    it('creates a valid USD to EUR rate', () => {
      const f = createFxRate(baseInput);
      expect(f.baseCurrency).toBe('USD');
      expect(f.targetCurrency).toBe('EUR');
      expect(f.rate).toBe(0.85);
    });

    it('rejects a zero rate', () => {
      expect(() => createFxRate({...baseInput, rate: 0})).toThrow(
        'Rate must be a finite number greater than zero',
      );
    });

    it('rejects a negative rate', () => {
      expect(() => createFxRate({...baseInput, rate: -0.1})).toThrow(
        'Rate must be a finite number greater than zero',
      );
    });
  });

  describe('isStale', () => {
    it('returns true when older than max age', () => {
      const fetchedAt = 0;
      const nowMs = 25 * HOUR_MS;
      const maxAgeMs = 24 * HOUR_MS;
      const f = createFxRate({...baseInput, fetchedAt});
      expect(isStale(f, nowMs, maxAgeMs)).toBe(true);
    });

    it('returns false when within max age', () => {
      const fetchedAt = 0;
      const nowMs = 12 * HOUR_MS;
      const maxAgeMs = 24 * HOUR_MS;
      const f = createFxRate({...baseInput, fetchedAt});
      expect(isStale(f, nowMs, maxAgeMs)).toBe(false);
    });
  });

  describe('convert', () => {
    it('converts cents using the rate with rounding', () => {
      const f = createFxRate(baseInput);
      expect(convert(f, 1000)).toBe(850);
    });
  });

  describe('getInverseRate', () => {
    it('returns one divided by the rate', () => {
      const f = createFxRate({...baseInput, rate: 2});
      expect(getInverseRate(f)).toBe(0.5);
    });
  });
});
