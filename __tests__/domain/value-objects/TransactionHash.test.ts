import {
  generateTransactionHash,
  areHashesEqual,
} from '@domain/value-objects/TransactionHash';

describe('TransactionHash value object', () => {
  describe('generateTransactionHash', () => {
    it('should generate a deterministic hash from transaction data', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different amounts', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(2000, 'USD', 1704067200000, 'payoneer');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different currencies', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(1500, 'EUR', 1704067200000, 'payoneer');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different timestamps', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(1500, 'USD', 1704067200001, 'payoneer');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different sources', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(1500, 'USD', 1704067200000, 'grey');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a non-empty string', () => {
      const hash = generateTransactionHash(100, 'ETB', Date.now(), 'manual');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('areHashesEqual', () => {
    it('should return true for equal hashes', () => {
      const hash = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      expect(areHashesEqual(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = generateTransactionHash(1500, 'USD', 1704067200000, 'payoneer');
      const hash2 = generateTransactionHash(2000, 'USD', 1704067200000, 'payoneer');
      expect(areHashesEqual(hash1, hash2)).toBe(false);
    });
  });
});
