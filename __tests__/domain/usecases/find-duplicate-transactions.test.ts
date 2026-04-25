import {findDuplicateTransactions} from '@domain/usecases/find-duplicate-transactions';
import type {Transaction} from '@domain/entities/Transaction';

const DAY_MS = 86_400_000;

function transaction(input: Partial<Transaction> & {id: string}): Transaction {
  return {
    walletId: 'wallet-1',
    categoryId: 'cat-1',
    amount: 1200,
    currency: 'USD',
    type: 'expense',
    description: '',
    merchant: 'Uber Eats',
    source: 'manual',
    sourceHash: '',
    tags: [],
    receiptUri: '',
    isRecurring: false,
    recurrenceRule: '',
    confidence: 1,
    notes: '',
    isTemplate: false,
    templateName: '',
    transactionDate: 1_704_000_000_000,
    createdAt: 1_704_000_000_000,
    updatedAt: 1_704_000_000_000,
    ...input,
  };
}

describe('findDuplicateTransactions', () => {
  it('groups transactions with same amount, currency, nearby date, and similar merchant', () => {
    const groups = findDuplicateTransactions([
      transaction({id: 'txn-1', merchant: 'Uber Eats'}),
      transaction({id: 'txn-2', merchant: 'uber eats ', transactionDate: 1_704_000_000_000 + DAY_MS}),
      transaction({id: 'txn-3', merchant: 'Starbucks'}),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].transactions.map((t) => t.id)).toEqual(['txn-1', 'txn-2']);
    expect(groups[0].reason).toContain('same amount');
  });

  it('groups matching non-empty source hashes even when merchant text differs', () => {
    const groups = findDuplicateTransactions([
      transaction({id: 'txn-1', sourceHash: 'hash-1', merchant: 'Bank Notification'}),
      transaction({id: 'txn-2', sourceHash: 'hash-1', merchant: 'Parsed Push'}),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].transactions.map((t) => t.id)).toEqual(['txn-1', 'txn-2']);
    expect(groups[0].reason).toContain('source hash');
  });

  it('does not group transactions with different currencies', () => {
    const groups = findDuplicateTransactions([
      transaction({id: 'txn-1', currency: 'USD'}),
      transaction({id: 'txn-2', currency: 'EUR'}),
    ]);

    expect(groups).toEqual([]);
  });
});
