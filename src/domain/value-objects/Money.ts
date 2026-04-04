export type Money = {
  readonly amountInCents: number;
  readonly currency: string;
};

export function createMoney(amountInCents: number, currency: string): Money {
  if (!Number.isInteger(amountInCents)) {
    throw new Error('Amount must be an integer (cents)');
  }
  if (!currency || currency.length !== 3) {
    throw new Error('Currency must be a 3-letter ISO code');
  }
  return {amountInCents, currency: currency.toUpperCase()};
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot add different currencies directly');
  }
  return createMoney(a.amountInCents + b.amountInCents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot subtract different currencies directly');
  }
  return createMoney(a.amountInCents - b.amountInCents, a.currency);
}

export function formatMoney(money: Money): string {
  const major = Math.abs(money.amountInCents) / 100;
  const sign = money.amountInCents < 0 ? '-' : '';
  return `${sign}${money.currency} ${major.toFixed(2)}`;
}

export function isPositive(money: Money): boolean {
  return money.amountInCents > 0;
}

export function isZero(money: Money): boolean {
  return money.amountInCents === 0;
}
