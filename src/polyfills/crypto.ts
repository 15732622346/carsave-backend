import { randomUUID, webcrypto } from 'node:crypto';

type CryptoWithUUID = typeof webcrypto & { randomUUID?: () => string };

const globalForCrypto = globalThis as unknown as { crypto?: CryptoWithUUID };

if (!globalForCrypto.crypto) {
  globalForCrypto.crypto = webcrypto as CryptoWithUUID;
}

if (!globalForCrypto.crypto.randomUUID) {
  globalForCrypto.crypto.randomUUID = randomUUID;
}
