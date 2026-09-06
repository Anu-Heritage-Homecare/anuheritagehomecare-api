import { AdminRole } from '../../domain/admin-role.enum';

export interface AdminAccessTokenClaims {
  sub: string;
  role: AdminRole;
  email: string;
  /** The admin session this token was issued to, so the current device is identifiable. */
  sid: string;
  typ: 'admin-access';
}

export interface AdminRefreshTokenClaims {
  sub: string;
  typ: 'admin-refresh';
}

/** A freshly signed refresh token plus the derived hash to persist and its expiry. */
export interface IssuedAdminRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Port over JWT signing and verification for admin tokens. Access and refresh
 * tokens each use a distinct secret and lifetime, all separate from the mobile
 * app secrets. Refresh tokens are additionally persisted as a hash for rotation
 * and revocation, so the port exposes a deterministic `hashToken` to look them up.
 */
export interface AdminTokenService {
  signAccess(claims: Omit<AdminAccessTokenClaims, 'typ'>): Promise<string>;
  signRefresh(claims: Omit<AdminRefreshTokenClaims, 'typ'>): Promise<IssuedAdminRefreshToken>;
  verifyRefresh(token: string): Promise<AdminRefreshTokenClaims>;
  hashToken(token: string): string;
}

export const ADMIN_TOKEN_SERVICE = Symbol('ADMIN_TOKEN_SERVICE');
