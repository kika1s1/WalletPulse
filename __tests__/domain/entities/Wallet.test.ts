import {createWallet, isNegativeBalance, type CreateWalletInput} from '@domain/entities/Wallet';

const baseInput: CreateWalletInput = {
  id: 'w1',
  currency: 'USD',
  name: 'Checking',
  balance: 10_000,
  isActive: true,
  icon: 'wallet',
  color: '#112233',
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 2,
};

describe('Wallet entity', () => {
  describe('createWallet', () => {
    it('creates a valid wallet', () => {
      const w = createWallet(baseInput);
      expect(w.id).toBe('w1');
      expect(w.name).toBe('Checking');
      expect(w.currency).toBe('USD');
      expect(w.balance).toBe(10_000);
      expect(w.isActive).toBe(true);
      expect(w.icon).toBe('wallet');
      expect(w.color).toBe('#112233');
      expect(w.sortOrder).toBe(0);
      expect(w.createdAt).toBe(1);
      expect(w.updatedAt).toBe(2);
    });

    it('normalizes currency to uppercase', () => {
      const w = createWallet({...baseInput, currency: 'etb'});
      expect(w.currency).toBe('ETB');
    });

    it('trims wallet name', () => {
      const w = createWallet({...baseInput, name: '  Savings  '});
      expect(w.name).toBe('Savings');
    });

    it('accepts three-digit hex color', () => {
      const w = createWallet({...baseInput, color: '#abc'});
      expect(w.color).toBe('#abc');
    });

    it('rejects empty name', () => {
      expect(() => createWallet({...baseInput, name: ''})).toThrow('Wallet name is required');
    });

    it('rejects whitespace-only name', () => {
      expect(() => createWallet({...baseInput, name: '  \t  '})).toThrow(
        'Wallet name is required',
      );
    });

    it('rejects invalid currency code length', () => {
      expect(() => createWallet({...baseInput, currency: 'US'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
      expect(() => createWallet({...baseInput, currency: 'USDD'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
    });

    it('rejects non-letter currency characters', () => {
      expect(() => createWallet({...baseInput, currency: 'US1'})).toThrow(
        'Currency must be a 3-letter ISO code',
      );
    });

    it('rejects color that is not valid hex', () => {
      expect(() => createWallet({...baseInput, color: 'blue'})).toThrow(
        'Color must be a hex value',
      );
      expect(() => createWallet({...baseInput, color: '#gg0000'})).toThrow(
        'Color must be a hex value',
      );
      expect(() => createWallet({...baseInput, color: '#12'})).toThrow(
        'Color must be a hex value',
      );
    });
  });

  describe('isNegativeBalance', () => {
    it('returns true when balance is below zero', () => {
      expect(isNegativeBalance(createWallet({...baseInput, balance: -1}))).toBe(true);
    });

    it('returns false when balance is zero or positive', () => {
      expect(isNegativeBalance(createWallet({...baseInput, balance: 0}))).toBe(false);
      expect(isNegativeBalance(createWallet({...baseInput, balance: 1}))).toBe(false);
    });
  });
});
