import { ConfigService } from '@nestjs/config';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { EmailMessage, EmailSender } from '../application/ports/email-sender.port';
import { OtpGenerator } from '../application/ports/otp-generator.port';
import { PasswordHasher } from '../application/ports/password-hasher.port';
import {
  AccessTokenClaims,
  IssuedRefreshToken,
  RefreshTokenClaims,
  ResetTokenClaims,
  TokenService,
} from '../application/ports/token-service.port';
import { RefreshToken } from '../domain/refresh-token.entity';
import { RefreshTokenRepository } from '../domain/refresh-token.repository';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { VerificationPurpose } from '../domain/verification-purpose.enum';
import { VerificationCode } from '../domain/verification-code.entity';
import { VerificationCodeRepository } from '../domain/verification-code.repository';

/**
 * Deterministic in memory test doubles for the identity use case specs. These
 * mirror the real ports closely enough to exercise the orchestration without a
 * database, JWT library or SMTP server.
 */

export const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'id'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export function fakeOtpConfig(
  overrides: Partial<{ length: number; ttlMinutes: number; maxAttempts: number }> = {},
): ConfigService {
  const otp = { length: 6, ttlMinutes: 10, maxAttempts: 5, ...overrides };
  return { getOrThrow: () => otp } as unknown as ConfigService;
}

/** Reversible fake hasher: the "hash" is just a tagged form of the input. */
export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

export class FixedOtpGenerator implements OtpGenerator {
  constructor(private readonly code = '123456') {}

  generateNumeric(): string {
    return this.code;
  }
}

export class RecordingEmailSender implements EmailSender {
  public readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

/** Opaque, deterministic token service that mimics purpose scoping and rotation. */
export class FakeTokenService implements TokenService {
  private counter = 0;

  signAccess(claims: Omit<AccessTokenClaims, 'typ'>): Promise<string> {
    return Promise.resolve(`access:${claims.sub}`);
  }

  signRefresh(claims: Omit<RefreshTokenClaims, 'typ'>): Promise<IssuedRefreshToken> {
    this.counter += 1;
    const token = `refresh:${claims.sub}:${this.counter}`;
    return Promise.resolve({
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(FIXED_NOW.getTime() + 30 * 86_400_000),
    });
  }

  verifyRefresh(token: string): Promise<RefreshTokenClaims> {
    if (!token.startsWith('refresh:')) {
      return Promise.reject(new UnauthorizedDomainException('Invalid or expired token'));
    }
    return Promise.resolve({ sub: token.split(':')[1], typ: 'refresh' });
  }

  hashToken(token: string): string {
    return `h:${token}`;
  }

  signResetToken(claims: Omit<ResetTokenClaims, 'typ'>): Promise<string> {
    return Promise.resolve(`reset:${claims.sub}`);
  }

  verifyResetToken(token: string): Promise<ResetTokenClaims> {
    if (!token.startsWith('reset:')) {
      return Promise.reject(new UnauthorizedDomainException('Invalid or expired token'));
    }
    return Promise.resolve({ sub: token.slice('reset:'.length), typ: 'reset' });
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();

  save(user: User): Promise<void> {
    this.store.set(user.id, user);
    return Promise.resolve();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const found = [...this.store.values()].find((u) => u.email.value === email);
    return Promise.resolve(found ?? null);
  }

  existsByEmail(email: string): Promise<boolean> {
    return Promise.resolve([...this.store.values()].some((u) => u.email.value === email));
  }

  existsByPhone(phone: string): Promise<boolean> {
    return Promise.resolve([...this.store.values()].some((u) => u.phone.value === phone));
  }
}

export class InMemoryVerificationCodeRepository implements VerificationCodeRepository {
  private readonly store = new Map<string, VerificationCode>();

  save(code: VerificationCode): Promise<void> {
    this.store.set(code.id, code);
    return Promise.resolve();
  }

  findLatestActive(
    userId: string,
    purpose: VerificationPurpose,
    now: Date,
  ): Promise<VerificationCode | null> {
    const active = [...this.store.values()]
      .filter(
        (c) =>
          c.userId === userId &&
          c.purpose === purpose &&
          c.consumedAt === null &&
          c.expiresAt.getTime() > now.getTime(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve(active[0] ?? null);
  }

  deleteActiveByUserAndPurpose(userId: string, purpose: VerificationPurpose): Promise<void> {
    for (const [id, code] of this.store) {
      if (code.userId === userId && code.purpose === purpose && code.consumedAt === null) {
        this.store.delete(id);
      }
    }
    return Promise.resolve();
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  public readonly store = new Map<string, RefreshToken>();

  save(token: RefreshToken): Promise<void> {
    this.store.set(token.id, token);
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const found = [...this.store.values()].find((t) => t.tokenHash === tokenHash);
    return Promise.resolve(found ?? null);
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const token of this.store.values()) {
      if (token.userId === userId) {
        token.revoke(now);
      }
    }
    return Promise.resolve();
  }
}
