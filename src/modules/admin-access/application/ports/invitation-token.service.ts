/**
 * Mints and hashes the one time token that proves ownership of an invitation. The
 * raw token leaves the server once (delivered out of band); only its hash is
 * stored, so a leaked database cannot be used to accept invitations.
 */
export interface InvitationTokenService {
  /** Generate a fresh token and its stored hash. */
  generate(): { token: string; tokenHash: string };
  /** Hash a presented raw token for lookup against the stored hash. */
  hash(token: string): string;
}

export const INVITATION_TOKEN_SERVICE = Symbol('INVITATION_TOKEN_SERVICE');
