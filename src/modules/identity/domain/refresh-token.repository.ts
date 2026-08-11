import { RefreshToken } from './refresh-token.entity';

/**
 * Persistence port for refresh tokens. Tokens are looked up by their hash;
 * rotation revokes the presented token and stores a fresh one.
 */
export interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
