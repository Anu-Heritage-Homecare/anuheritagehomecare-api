import { UserType } from '../../domain/user-type.enum';

export interface AccessTokenClaims {
  sub: string;
  userType: UserType;
  typ: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  typ: 'refresh';
}

export interface ResetTokenClaims {
  sub: string;
  typ: 'reset';
}

/** A freshly signed refresh token plus the derived hash to persist and its expiry. */
export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Port over JWT signing and verification. Access, refresh and reset tokens each
 * use a distinct secret and lifetime. Refresh tokens are additionally persisted
 * as a hash for rotation and revocation, so the port exposes a deterministic
 * `hashToken` used to look them up.
 */
export interface TokenService {
  signAccess(claims: Omit<AccessTokenClaims, 'typ'>): Promise<string>;
  signRefresh(claims: Omit<RefreshTokenClaims, 'typ'>): Promise<IssuedRefreshToken>;
  verifyRefresh(token: string): Promise<RefreshTokenClaims>;
  hashToken(token: string): string;
  signResetToken(claims: Omit<ResetTokenClaims, 'typ'>): Promise<string>;
  verifyResetToken(token: string): Promise<ResetTokenClaims>;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
