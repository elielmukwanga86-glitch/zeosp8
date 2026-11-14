import { createHash, randomBytes } from 'node:crypto';

/** Jeton aléatoire URL-safe (256 bits par défaut). */
export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte SHA-256 hexadécimale, identique à encode(sha256(...), 'hex') en SQL. */
export function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
