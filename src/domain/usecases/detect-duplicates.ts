import type {Transaction, TransactionSource} from '@domain/entities/Transaction';
import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import {generateTransactionHash} from '@domain/value-objects/TransactionHash';

export type DetectDuplicatesInput = {
  amount: number;
  currency: string;
  timestampMs: number;
  source: TransactionSource;
};

export type DetectDuplicatesResult = {
  isDuplicate: boolean;
  existingTransaction: Transaction | null;
  hash: string;
};

export type MakeDetectDuplicatesDeps = {
  transactionRepo: ITransactionRepository;
};

export function makeDetectDuplicates(deps: MakeDetectDuplicatesDeps) {
  const {transactionRepo} = deps;

  return async function detectDuplicates(
    input: DetectDuplicatesInput,
  ): Promise<DetectDuplicatesResult> {
    const hash = generateTransactionHash(
      input.amount,
      input.currency,
      input.timestampMs,
      input.source,
    );
    const existingTransaction = await transactionRepo.findBySourceHash(hash);
    return {
      isDuplicate: existingTransaction !== null,
      existingTransaction,
      hash,
    };
  };
}
