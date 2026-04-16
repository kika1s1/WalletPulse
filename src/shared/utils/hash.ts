/**
 * Lightweight string hash for non-crypto purposes (dedup keys, cache keys).
 * Uses djb2 algorithm. For crypto-grade hashing, use a proper library.
 */
export function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/** UUID v4 generator safe for React Native / Hermes (no crypto.getRandomValues dependency). */
export function generateId(): string {
  const h = '0123456789abcdef';
  let u = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      u += '-';
    } else if (i === 14) {
      u += '4';
    } else if (i === 19) {
      u += h[(Math.random() * 4) | 8];
    } else {
      u += h[(Math.random() * 16) | 0];
    }
  }
  return u;
}
