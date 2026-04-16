import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';
import {sha256} from 'js-sha256';

export function generateSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hashPassword(password: string, salt: string): string {
  const hash = sha256(salt + password);
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const colonIndex = storedHash.indexOf(':');
  if (colonIndex === -1) {
    return false;
  }
  const salt = storedHash.substring(0, colonIndex);
  const reHashed = hashPassword(password, salt);
  return reHashed === storedHash;
}

export function generateToken(): string {
  return uuidv4();
}
