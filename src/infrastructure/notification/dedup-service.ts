import type {ITransactionRepository} from '@domain/repositories/ITransactionRepository';
import {generateTransactionHash} from '@domain/value-objects/TransactionHash';

const DEFAULT_MAX_CACHE = 1000;

export type DedupResult = {
  isDuplicate: boolean;
  hash: string;
};

export type DedupService = {
  isDuplicate(
    amountCents: number,
    currency: string,
    timestampMs: number,
    source: string,
  ): Promise<DedupResult>;
  markSeen(hash: string): void;
  clear(): void;
};

export function createDedupService(
  transactionRepo: ITransactionRepository,
  maxCacheSize: number = DEFAULT_MAX_CACHE,
): DedupService {
  const seenHashes: string[] = [];
  const seenSet = new Set<string>();

  function addToCache(hash: string): void {
    if (seenSet.has(hash)) {
      return;
    }
    if (seenHashes.length >= maxCacheSize) {
      const evicted = seenHashes.shift();
      if (evicted) {
        seenSet.delete(evicted);
      }
    }
    seenHashes.push(hash);
    seenSet.add(hash);
  }

  return {
    async isDuplicate(
      amountCents: number,
      currency: string,
      timestampMs: number,
      source: string,
    ): Promise<DedupResult> {
      const minuteFloored = Math.floor(timestampMs / 60000);
      const hash = generateTransactionHash(
        amountCents,
        currency,
        minuteFloored,
        source,
      );

      if (seenSet.has(hash)) {
        return {isDuplicate: true, hash};
      }

      const existing = await transactionRepo.findBySourceHash(hash);
      if (existing) {
        addToCache(hash);
        return {isDuplicate: true, hash};
      }

      return {isDuplicate: false, hash};
    },

    markSeen(hash: string): void {
      addToCache(hash);
    },

    clear(): void {
      seenHashes.length = 0;
      seenSet.clear();
    },
  };
}
