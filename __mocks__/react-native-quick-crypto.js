/**
 * Jest mock for react-native-quick-crypto.
 *
 * Delegates to Node's built-in `crypto` module so tests get real cryptographic
 * correctness (PBKDF2, random bytes, etc.) without needing the native module.
 *
 * Only the subset used by the app is wired up — extend as new calls are added.
 */
const nodeCrypto = require('crypto');

function pbkdf2(password, salt, iterations, keylen, digest, callback) {
  const normalizedDigest = (digest || 'sha256').toLowerCase();
  nodeCrypto.pbkdf2(
    password,
    salt,
    iterations,
    keylen,
    normalizedDigest,
    callback,
  );
}

function pbkdf2Sync(password, salt, iterations, keylen, digest) {
  const normalizedDigest = (digest || 'sha256').toLowerCase();
  return nodeCrypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    keylen,
    normalizedDigest,
  );
}

function randomBytes(size, callback) {
  if (typeof callback === 'function') {
    nodeCrypto.randomBytes(size, callback);
    return undefined;
  }
  return nodeCrypto.randomBytes(size);
}

function createHash(algorithm) {
  return nodeCrypto.createHash(algorithm);
}

function install() {}

const api = {
  pbkdf2,
  pbkdf2Sync,
  randomBytes,
  createHash,
  install,
};

module.exports = api;
module.exports.default = api;
