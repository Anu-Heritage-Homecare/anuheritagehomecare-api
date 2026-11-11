import { createHash, randomBytes } from 'node:crypto';

/** The product prefix every key carries, so a leaked secret is recognisable. */
export const API_KEY_PREFIX = 'sk-cp';

/**
 * Mint a fresh secret. The hyphen after the prefix is part of the key's wire
 * format (shown to users as `sk-cp-...`), not an authored identifier. The body is
 * high entropy random hex, so the stored hash needs no slow (password style)
 * hashing to resist guessing.
 */
export function generateApiKeySecret(): { secret: string; keyPrefix: string; last4: string } {
  const body = randomBytes(24).toString('hex');
  return { secret: `${API_KEY_PREFIX}-${body}`, keyPrefix: API_KEY_PREFIX, last4: body.slice(-4) };
}

/** The SHA-256 hash stored for a secret, and recomputed to authenticate a caller. */
export function hashApiKeySecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
