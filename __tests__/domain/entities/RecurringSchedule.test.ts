import {
  createRecurringSchedule,
  recurrenceRuleToCadence,
  type RecurringSchedule,
} from '@domain/entities/RecurringSchedule';

function baseInput(over: Partial<RecurringSchedule> = {}): RecurringSchedule {
  const now = Date.now();
  return {
    id: 'rs-1',
    templateTransactionId: 'tx-1',
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 1599,
    currency: 'USD',
    merchant: 'Netflix',
    description: '',
    tags: [],
    cadence: 'monthly',
    nextDueDate: now + 86_400_000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('createRecurringSchedule', () => {
  it('returns a frozen-shape object that mirrors the input', () => {
    const input = baseInput();
    const out = createRecurringSchedule(input);
    expect(out).toMatchObject({
      id: input.id,
      templateTransactionId: input.templateTransactionId,
      walletId: input.walletId,
      categoryId: input.categoryId,
      type: 'expense',
      amount: 1599,
      currency: 'USD',
      cadence: 'monthly',
      nextDueDate: input.nextDueDate,
      isActive: true,
    });
  });

  it('clones tags so external mutation does not leak in', () => {
    const tags = ['work'];
    const out = createRecurringSchedule(baseInput({tags}));
    tags.push('after');
    expect(out.tags).toEqual(['work']);
  });

  it.each(['', '   '])('rejects empty id (%s)', (id) => {
    expect(() => createRecurringSchedule(baseInput({id}))).toThrow(/id is required/);
  });

  it('rejects empty templateTransactionId', () => {
    expect(() => createRecurringSchedule(baseInput({templateTransactionId: ''}))).toThrow();
  });

  it('rejects empty walletId / categoryId', () => {
    expect(() => createRecurringSchedule(baseInput({walletId: ''}))).toThrow();
    expect(() => createRecurringSchedule(baseInput({categoryId: ''}))).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() =>
      createRecurringSchedule(baseInput({type: 'transfer' as unknown as 'expense'})),
    ).toThrow(/type/);
  });

  it.each([0, -1, NaN, Infinity])('rejects non-positive or non-finite amount %p', (amount) => {
    expect(() => createRecurringSchedule(baseInput({amount}))).toThrow(/Amount/);
  });

  it.each(['us', 'usd', 'USDD'])('rejects bad currency %s', (currency) => {
    expect(() => createRecurringSchedule(baseInput({currency}))).toThrow(/Currency/);
  });

  it('rejects invalid cadence', () => {
    expect(() =>
      createRecurringSchedule(baseInput({cadence: 'fortnightly' as unknown as 'monthly'})),
    ).toThrow(/cadence/);
  });

  it('rejects non-positive nextDueDate', () => {
    expect(() => createRecurringSchedule(baseInput({nextDueDate: 0}))).toThrow();
  });

  it.each([
    ['daily' as const],
    ['weekly' as const],
    ['biweekly' as const],
    ['monthly' as const],
    ['quarterly' as const],
    ['yearly' as const],
  ])('accepts cadence %s', (cadence) => {
    const out = createRecurringSchedule(baseInput({cadence}));
    expect(out.cadence).toBe(cadence);
  });

  it.each([
    ['income' as const],
    ['expense' as const],
  ])('accepts type %s', (type) => {
    const out = createRecurringSchedule(baseInput({type}));
    expect(out.type).toBe(type);
  });
});

describe('recurrenceRuleToCadence', () => {
  it.each([
    ['DAILY', 'daily'],
    ['WEEKLY', 'weekly'],
    ['BIWEEKLY', 'biweekly'],
    ['MONTHLY', 'monthly'],
    ['QUARTERLY', 'quarterly'],
    ['YEARLY', 'yearly'],
    ['monthly', 'monthly'],
  ])('maps %s -> %s', (rule, expected) => {
    expect(recurrenceRuleToCadence(rule)).toBe(expected);
  });

  it('returns null for unknown rules', () => {
    expect(recurrenceRuleToCadence('FORTNIGHTLY')).toBeNull();
    expect(recurrenceRuleToCadence('')).toBeNull();
  });
});
