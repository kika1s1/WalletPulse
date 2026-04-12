import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import type {IWalletRepository} from '@domain/repositories/IWalletRepository';
import {createTransaction, type Transaction} from '@domain/entities/Transaction';
import {transactionLedgerDeltaCentsFromTransaction} from '@domain/value-objects/WalletTransferNotes';

export type UpdateTransactionInput = {id: string} & Partial<Omit<Transaction, 'id'>>;

type Deps = {
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
};

function toCreateInputFromTransaction(t: Transaction) {
  return {
    id: t.id,
    walletId: t.walletId,
    categoryId: t.categoryId,
    amount: t.amount,
    currency: t.currency,
    type: t.type,
    description: t.description,
    merchant: t.merchant,
    source: t.source,
    sourceHash: t.sourceHash,
    tags: t.tags,
    receiptUri: t.receiptUri,
    isRecurring: t.isRecurring,
    recurrenceRule: t.recurrenceRule,
    confidence: t.confidence,
    locationLat: t.locationLat,
    locationLng: t.locationLng,
    locationName: t.locationName,
    notes: t.notes,
    isTemplate: t.isTemplate,
    templateName: t.templateName,
    transactionDate: t.transactionDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function makeUpdateTransaction({transactionRepo, walletRepo}: Deps) {
  return async (input: UpdateTransactionInput): Promise<Transaction> => {
    const existing = await transactionRepo.findById(input.id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    const merged: Transaction = {...existing, ...input, id: existing.id};
    const updated = createTransaction(toCreateInputFromTransaction(merged));

    const oldDelta = transactionLedgerDeltaCentsFromTransaction(existing);
    const newDelta = transactionLedgerDeltaCentsFromTransaction(updated);

    await transactionRepo.update(updated);

    try {
      if (existing.walletId === updated.walletId) {
        const wallet = await walletRepo.findById(existing.walletId);
        if (wallet) {
          const nextBalance = wallet.balance - oldDelta + newDelta;
          await walletRepo.updateBalance(updated.walletId, nextBalance);
        }
      } else {
        const oldWallet = await walletRepo.findById(existing.walletId);
        if (oldWallet) {
          await walletRepo.updateBalance(existing.walletId, oldWallet.balance - oldDelta);
        }
        const newWallet = await walletRepo.findById(updated.walletId);
        if (newWallet) {
          await walletRepo.updateBalance(updated.walletId, newWallet.balance + newDelta);
        }
      }
    } catch {
      // Balance update is secondary; transaction is updated
    }

    return updated;
  };
}
