import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { createHash } from 'node:crypto';
import {
  AdminAccessTokenClaims,
  AdminRefreshTokenClaims,
  AdminTokenService,
  IssuedAdminRefreshToken,
} from '../../application/ports/token-service.port';

/**
 * JWT implementation of the AdminTokenService port. Access and refresh tokens are
 * signed with the admin secrets, which are entirely separate from the mobile app
 * secrets, so a mobile token can never authenticate an admin route or the reverse.
 * Refresh tokens are hashed with SHA-256 for persistence.
 */
@Injectable()
export class AdminJwtTokenService implements AdminTokenService {
  private readonly auth: AdminAuthConfig;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.auth = config.getOrThrow<AdminAuthConfig>('adminAuth');
  }

  signAccess(claims: Omit<AdminAccessTokenClaims, 'typ'>): Promise<string> {
    const payload: AdminAccessTokenClaims = { ...claims, typ: 'admin-access' };
    return this.jwt.signAsync(payload, {
      secret: this.auth.accessSecret,
      expiresIn: durationToSeconds(this.auth.accessTtl),
    });
  }

  async signRefresh(
    claims: Omit<AdminRefreshTokenClaims, 'typ'>,
  ): Promise<IssuedAdminRefreshToken> {
    const payload: AdminRefreshTokenClaims = { ...claims, typ: 'admin-refresh' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.auth.refreshSecret,
      expiresIn: durationToSeconds(this.auth.refreshTtl),
    });
    const expiresAt = new Date(this.clock.now().getTime() + durationToMs(this.auth.refreshTtl));
    return { token, tokenHash: this.hashToken(token), expiresAt };
  }

  async verifyRefresh(token: string): Promise<AdminRefreshTokenClaims> {
    let claims: AdminRefreshTokenClaims;
    try {
      claims = await this.jwt.verifyAsync<AdminRefreshTokenClaims>(token, {
        secret: this.auth.refreshSecret,
      });
    } catch {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    if (claims.typ !== 'admin-refresh') {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    return claims;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a JWT style duration ("15m", "12h", "45s", or bare seconds) to milliseconds. */
function durationToMs(ttl: string): number {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (match === null) {
    throw new Error(`Unsupported token TTL format: ${ttl}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  return unit === undefined ? amount * UNIT_MS.s : amount * UNIT_MS[unit];
}

/** The same duration expressed in whole seconds, for JWT `expiresIn`. */
function durationToSeconds(ttl: string): number {
  return Math.floor(durationToMs(ttl) / 1000);
}
