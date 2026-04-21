/* eslint-disable no-bitwise -- intentional bitwise ops for djb2 hash */
/**
 * Deduplication hash for auto-detected transactions.
 * Uses a simple but deterministic string hash (djb2 variant)
 * to produce a compact fingerprint from transaction properties.
 */

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function generateTransactionHash(
  amountInCents: number,
  currency: string,
  timestampMs: number,
  source: string,
): string {
  const raw = `${amountInCents}|${currency.toUpperCase()}|${timestampMs}|${source.toLowerCase()}`;
  return djb2Hash(raw);
}

export function areHashesEqual(a: string, b: string): boolean {
  return a === b;
}
