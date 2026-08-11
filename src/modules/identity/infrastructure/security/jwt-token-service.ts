import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { Inject } from '@nestjs/common';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { createHash } from 'node:crypto';
import {
  AccessTokenClaims,
  IssuedRefreshToken,
  RefreshTokenClaims,
  ResetTokenClaims,
  TokenService,
} from '../../application/ports/token-service.port';

/**
 * JWT implementation of the TokenService port. Each token purpose (access,
 * refresh, reset) is signed with its own secret and lifetime so a token can only
 * ever be used for its intended purpose. Refresh tokens are additionally hashed
 * with SHA-256 for persistence, since bcrypt would silently truncate a long JWT.
 */
@Injectable()
export class JwtTokenService implements TokenService {
  private readonly auth: AuthConfig;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.auth = config.getOrThrow<AuthConfig>('auth');
  }

  signAccess(claims: Omit<AccessTokenClaims, 'typ'>): Promise<string> {
    const payload: AccessTokenClaims = { ...claims, typ: 'access' };
    return this.jwt.signAsync(payload, {
      secret: this.auth.accessSecret,
      expiresIn: durationToSeconds(this.auth.accessTtl),
    });
  }

  async signRefresh(claims: Omit<RefreshTokenClaims, 'typ'>): Promise<IssuedRefreshToken> {
    const payload: RefreshTokenClaims = { ...claims, typ: 'refresh' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.auth.refreshSecret,
      expiresIn: durationToSeconds(this.auth.refreshTtl),
    });
    const expiresAt = new Date(this.clock.now().getTime() + durationToMs(this.auth.refreshTtl));
    return { token, tokenHash: this.hashToken(token), expiresAt };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenClaims> {
    const claims = await this.verify<RefreshTokenClaims>(token, this.auth.refreshSecret);
    if (claims.typ !== 'refresh') {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    return claims;
  }

  signResetToken(claims: Omit<ResetTokenClaims, 'typ'>): Promise<string> {
    const payload: ResetTokenClaims = { ...claims, typ: 'reset' };
    return this.jwt.signAsync(payload, {
      secret: this.auth.resetSecret,
      expiresIn: durationToSeconds(this.auth.resetTtl),
    });
  }

  async verifyResetToken(token: string): Promise<ResetTokenClaims> {
    const claims = await this.verify<ResetTokenClaims>(token, this.auth.resetSecret);
    if (claims.typ !== 'reset') {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    return claims;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verify<T extends object>(token: string, secret: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, { secret });
    } catch {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
  }
}

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a JWT style duration ("15m", "30d", "45s", or bare seconds) to milliseconds. */
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
