import {generateSalt, hashPassword, verifyPassword, generateToken} from '@shared/utils/crypto';

describe('generateSalt', () => {
  it('returns a 64-character hex string', () => {
    const salt = generateSalt();
    expect(salt).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(salt)).toBe(true);
  });

  it('returns unique values', () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toBe(b);
  });
});

describe('hashPassword', () => {
  it('returns a salt:hash formatted string', () => {
    const result = hashPassword('password123', 'abc123');
    expect(result).toContain(':');
    const [salt, hash] = result.split(':');
    expect(salt).toBe('abc123');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('produces consistent hashes for same input', () => {
    const a = hashPassword('password123', 'same-salt');
    const b = hashPassword('password123', 'same-salt');
    expect(a).toBe(b);
  });

  it('produces different hashes for different passwords', () => {
    const a = hashPassword('password1', 'same-salt');
    const b = hashPassword('password2', 'same-salt');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different salts', () => {
    const a = hashPassword('password123', 'salt-a');
    const b = hashPassword('password123', 'salt-b');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', () => {
    const stored = hashPassword('mypassword', 'mysalt');
    const result = verifyPassword('mypassword', stored);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', () => {
    const stored = hashPassword('mypassword', 'mysalt');
    const result = verifyPassword('wrongpassword', stored);
    expect(result).toBe(false);
  });

  it('returns false for malformed stored hash', () => {
    const result = verifyPassword('any', 'no-colon-here');
    expect(result).toBe(false);
  });
});

describe('generateToken', () => {
  it('returns a UUID-formatted string', () => {
    const token = generateToken();
    expect(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token),
    ).toBe(true);
  });

  it('returns unique values', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});
