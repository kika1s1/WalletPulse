import {djb2, generateId} from '@shared/utils/hash';

describe('hash', () => {
  describe('djb2', () => {
    it('returns a deterministic string for the same input', () => {
      const input = 'walletpulse-transaction-key';
      expect(djb2(input)).toBe(djb2(input));
    });

    it('returns different hashes for different inputs', () => {
      expect(djb2('alpha')).not.toBe(djb2('beta'));
      expect(djb2('')).not.toBe(djb2('x'));
    });

    it('returns a non-empty string', () => {
      expect(djb2('test')).toMatch(/^[0-9a-z]+$/);
      expect(djb2('test').length).toBeGreaterThan(0);
    });
  });

  describe('generateId', () => {
    it('returns a valid UUID v4 string', () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('produces unique values on consecutive calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i += 1) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(50);
    });
  });
});
