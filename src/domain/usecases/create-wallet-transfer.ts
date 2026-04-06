import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import type {Transaction} from '@domain/entities/Transaction';
import type {CreateTransactionInput} from '@domain/entities/Transaction';
import {makeCreateTransaction} from '@domain/usecases/create-transaction';
import {buildWalletTransferNotes} from '@domain/value-objects/WalletTransferNotes';

type Deps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

export type CreateWalletTransferInput = {
  fromWalletId: string;
  toWalletId: string;
  fromWalletCurrency: string;
  toWalletCurrency: string;
  amountFromCents: number;
  amountToCents: number;
  categoryId: string;
  description?: string;
  merchant?: string;
  userNotes?: string;
  tags?: string[];
  transactionDate: number;
  fromWalletName?: string;
  toWalletName?: string;
};

function newTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

export function makeCreateWalletTransfer({transactionRepo, walletRepo}: Deps) {
  const createOne = makeCreateTransaction({transactionRepo, walletRepo});

  return async function execute(
    input: CreateWalletTransferInput,
  ): Promise<[Transaction, Transaction]> {
    const fromId = input.fromWalletId.trim();
    const toId = input.toWalletId.trim();
    if (!fromId || !toId) {
      throw new Error('From and to wallets are required');
    }
    if (fromId === toId) {
      throw new Error('Cannot transfer to the same wallet');
    }
    if (!Number.isFinite(input.amountFromCents) || input.amountFromCents <= 0) {
      throw new Error('Amount must be positive (cents)');
    }
    if (!Number.isFinite(input.amountToCents) || input.amountToCents <= 0) {
      throw new Error('Converted amount must be positive (cents)');
    }
    if (!input.categoryId.trim()) {
      throw new Error('Category id is required');
    }

    const idOut = newTransactionId();
    const idIn = newTransactionId();
    const now = Date.now();
    const userNotes = input.userNotes?.trim() ?? '';

    const notesOut = buildWalletTransferNotes(idIn, 'source', userNotes);
    const notesIn = buildWalletTransferNotes(idOut, 'destination', userNotes);

    const memo = input.description?.trim();
    const descOut =
      memo || `Transfer to ${(input.toWalletName ?? 'wallet').trim() || 'wallet'}`;
    const descIn =
      memo || `Transfer from ${(input.fromWalletName ?? 'wallet').trim() || 'wallet'}`;

    const merchant = input.merchant?.trim() ?? '';
    const tags = input.tags ?? [];

    const base: Omit<CreateTransactionInput, 'id' | 'walletId' | 'amount' | 'currency' | 'notes' | 'description'> =
      {
        categoryId: input.categoryId.trim(),
        type: 'transfer',
        source: 'manual',
        merchant,
        tags,
        transactionDate: input.transactionDate,
        createdAt: now,
        updatedAt: now,
      };

    const outInput: CreateTransactionInput = {
      ...base,
      id: idOut,
      walletId: fromId,
      amount: input.amountFromCents,
      currency: input.fromWalletCurrency.toUpperCase(),
      notes: notesOut,
      description: descOut,
    };

    const inInput: CreateTransactionInput = {
      ...base,
      id: idIn,
      walletId: toId,
      amount: input.amountToCents,
      currency: input.toWalletCurrency.toUpperCase(),
      notes: notesIn,
      description: descIn,
    };

    const outTxn = await createOne(outInput);
    const inTxn = await createOne(inInput);
    return [outTxn, inTxn];
  };
}
