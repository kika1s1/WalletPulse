export type Wallet = {
  id: string;
  currency: string;
  name: string;
  balance: number;
  isActive: boolean;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateWalletInput = {
  id: string;
  currency: string;
  name: string;
  balance: number;
  isActive: boolean;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function isThreeLetterIsoCurrency(code: string): boolean {
  return code.length === 3 && /^[A-Za-z]{3}$/.test(code);
}

export function createWallet(input: CreateWalletInput): Wallet {
  if (!input.name.trim()) {
    throw new Error('Wallet name is required');
  }
  if (!isThreeLetterIsoCurrency(input.currency)) {
    throw new Error('Currency must be a 3-letter ISO code');
  }
  if (!HEX_COLOR.test(input.color)) {
    throw new Error('Color must be a hex value');
  }

  return {
    id: input.id,
    currency: input.currency.toUpperCase(),
    name: input.name.trim(),
    balance: input.balance,
    isActive: input.isActive,
    icon: input.icon,
    color: input.color,
    sortOrder: input.sortOrder,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function isNegativeBalance(w: Wallet): boolean {
  return w.balance < 0;
}
