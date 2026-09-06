import { ConfigService } from '@nestjs/config';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { EmailMessage, EmailSender } from '../application/ports/email-sender.port';
import { OtpGenerator } from '../application/ports/otp-generator.port';
import { PasswordHasher } from '../application/ports/password-hasher.port';
import { SecretCipher } from '../application/ports/secret-cipher.port';
import { TwoFactorAuthenticator } from '../application/ports/two-factor-authenticator.port';
import { TwoFactorRecoveryCode } from '../domain/two-factor-recovery-code.entity';
import { TwoFactorRecoveryCodeRepository } from '../domain/two-factor-recovery-code.repository';
import {
  AccessTokenClaims,
  IssuedRefreshToken,
  MfaTokenClaims,
  RefreshTokenClaims,
  ResetTokenClaims,
  TokenService,
} from '../application/ports/token-service.port';
import { DeviceContext } from '../application/dto/device-context';
import { DeviceSession } from '../domain/device-session.entity';
import { DeviceSessionRepository } from '../domain/device-session.repository';
import { LoginEvent } from '../domain/login-event.entity';
import { LoginEventRepository } from '../domain/login-event.repository';
import { User } from '../domain/user.entity';
import { UserType } from '../domain/user-type.enum';
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

/** A stand in device context for use case specs that issue tokens. */
export const FAKE_DEVICE: DeviceContext = {
  deviceLabel: 'Test device',
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
};

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
  private alphanumericCounter = 0;

  constructor(private readonly code = '123456') {}

  generateNumeric(): string {
    return this.code;
  }

  generateAlphanumeric(length: number): string {
    this.alphanumericCounter += 1;
    return `RECOVERY${this.alphanumericCounter}`.padEnd(length, 'X').slice(0, length);
  }
}

export class RecordingEmailSender implements EmailSender {
  public readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

/** Reversible, non secret cipher so specs can assert what was stored. */
export class FakeSecretCipher implements SecretCipher {
  encrypt(plaintext: string): string {
    return `enc:${plaintext}`;
  }

  decrypt(ciphertext: string): string {
    if (!ciphertext.startsWith('enc:')) {
      throw new Error('Cannot decrypt value');
    }
    return ciphertext.slice('enc:'.length);
  }
}

/** A TOTP authenticator whose only valid code is a fixed value. */
export class FakeTwoFactorAuthenticator implements TwoFactorAuthenticator {
  constructor(
    private readonly validCode = '123456',
    private readonly secret = 'JBSWY3DPEHPK3PXP',
  ) {}

  generateSecret(): string {
    return this.secret;
  }

  keyUri(secret: string, accountName: string): string {
    return `otpauth://totp/${accountName}?secret=${secret}`;
  }

  verify(params: { secret: string; code: string; now: Date }): boolean {
    return params.code === this.validCode;
  }
}

export class InMemoryTwoFactorRecoveryCodeRepository implements TwoFactorRecoveryCodeRepository {
  public store: TwoFactorRecoveryCode[] = [];

  replaceForUser(userId: string, codes: TwoFactorRecoveryCode[]): Promise<void> {
    this.store = this.store.filter((code) => code.userId !== userId).concat(codes);
    return Promise.resolve();
  }

  findActive(userId: string, codeHash: string): Promise<TwoFactorRecoveryCode | null> {
    const match = this.store.find(
      (code) => code.userId === userId && code.codeHash === codeHash && !code.isUsed,
    );
    return Promise.resolve(match ?? null);
  }

  save(code: TwoFactorRecoveryCode): Promise<void> {
    const index = this.store.findIndex((existing) => existing.id === code.id);
    if (index >= 0) {
      this.store[index] = code;
    }
    return Promise.resolve();
  }

  deleteForUser(userId: string): Promise<void> {
    this.store = this.store.filter((code) => code.userId !== userId);
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

  signMfaToken(claims: Omit<MfaTokenClaims, 'typ'>): Promise<string> {
    return Promise.resolve(`mfa:${claims.sub}`);
  }

  verifyMfaToken(token: string): Promise<MfaTokenClaims> {
    if (!token.startsWith('mfa:')) {
      return Promise.reject(new UnauthorizedDomainException('Invalid or expired token'));
    }
    return Promise.resolve({ sub: token.slice('mfa:'.length), typ: 'mfa' });
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

  findByIds(ids: string[]): Promise<User[]> {
    const wanted = new Set(ids);
    return Promise.resolve([...this.store.values()].filter((user) => wanted.has(user.id)));
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

  countByType(userType: UserType): Promise<number> {
    return Promise.resolve([...this.store.values()].filter((u) => u.userType === userType).length);
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

export class InMemoryDeviceSessionRepository implements DeviceSessionRepository {
  public readonly store = new Map<string, DeviceSession>();

  save(session: DeviceSession): Promise<void> {
    this.store.set(session.id, session);
    return Promise.resolve();
  }

  findById(id: string): Promise<DeviceSession | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByCurrentTokenHash(tokenHash: string): Promise<DeviceSession | null> {
    const found = [...this.store.values()].find((s) => s.currentTokenHash === tokenHash);
    return Promise.resolve(found ?? null);
  }

  listActiveForUser(userId: string, now: Date): Promise<DeviceSession[]> {
    const active = [...this.store.values()]
      .filter((s) => s.userId === userId && s.isActive(now))
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());
    return Promise.resolve(active);
  }

  countActiveForUser(userId: string, now: Date): Promise<number> {
    const count = [...this.store.values()].filter(
      (s) => s.userId === userId && s.isActive(now),
    ).length;
    return Promise.resolve(count);
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const session of this.store.values()) {
      if (session.userId === userId) {
        session.revoke(now);
      }
    }
    return Promise.resolve();
  }
}

export class InMemoryLoginEventRepository implements LoginEventRepository {
  public readonly store: LoginEvent[] = [];

  save(event: LoginEvent): Promise<void> {
    this.store.push(event);
    return Promise.resolve();
  }

  listRecentForUser(userId: string, limit: number): Promise<LoginEvent[]> {
    const recent = this.store
      .filter((event) => event.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return Promise.resolve(recent);
  }
}
