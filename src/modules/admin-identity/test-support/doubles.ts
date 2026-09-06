import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import { DeviceContext } from '../application/dto/device-context';
import { PasswordHasher } from '../application/ports/password-hasher.port';
import {
  AdminAccessTokenClaims,
  AdminRefreshTokenClaims,
  AdminTokenService,
  IssuedAdminRefreshToken,
} from '../application/ports/token-service.port';
import { AdminSession } from '../domain/admin-session.entity';
import { AdminSessionRepository } from '../domain/admin-session.repository';
import { AdminUser } from '../domain/admin-user.entity';
import { AdminUserRepository } from '../domain/admin-user.repository';

/**
 * Deterministic in memory test doubles for the admin identity use case specs.
 * They mirror the real ports closely enough to exercise the orchestration without
 * a database or JWT library.
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

/** Reversible fake hasher: the "hash" is just a tagged form of the input. */
export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

/** Opaque, deterministic token service that mimics purpose scoping and rotation. */
export class FakeAdminTokenService implements AdminTokenService {
  private counter = 0;

  signAccess(claims: Omit<AdminAccessTokenClaims, 'typ'>): Promise<string> {
    return Promise.resolve(`access:${claims.sub}:${claims.sid}`);
  }

  signRefresh(claims: Omit<AdminRefreshTokenClaims, 'typ'>): Promise<IssuedAdminRefreshToken> {
    this.counter += 1;
    const token = `refresh:${claims.sub}:${this.counter}`;
    return Promise.resolve({
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(FIXED_NOW.getTime() + 12 * 3_600_000),
    });
  }

  verifyRefresh(token: string): Promise<AdminRefreshTokenClaims> {
    if (!token.startsWith('refresh:')) {
      return Promise.reject(new UnauthorizedDomainException('Invalid or expired token'));
    }
    return Promise.resolve({ sub: token.split(':')[1], typ: 'admin-refresh' });
  }

  hashToken(token: string): string {
    return `h:${token}`;
  }
}

export class InMemoryAdminUserRepository implements AdminUserRepository {
  private readonly store = new Map<string, AdminUser>();

  save(admin: AdminUser): Promise<void> {
    this.store.set(admin.id, admin);
    return Promise.resolve();
  }

  findById(id: string): Promise<AdminUser | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByEmail(email: string): Promise<AdminUser | null> {
    const found = [...this.store.values()].find((a) => a.email.value === email);
    return Promise.resolve(found ?? null);
  }
}

export class InMemoryAdminSessionRepository implements AdminSessionRepository {
  public readonly store = new Map<string, AdminSession>();

  save(session: AdminSession): Promise<void> {
    this.store.set(session.id, session);
    return Promise.resolve();
  }

  findByCurrentTokenHash(tokenHash: string): Promise<AdminSession | null> {
    const found = [...this.store.values()].find((s) => s.currentTokenHash === tokenHash);
    return Promise.resolve(found ?? null);
  }

  revokeAllForAdmin(adminUserId: string, now: Date): Promise<void> {
    for (const session of this.store.values()) {
      if (session.adminUserId === adminUserId) {
        session.revoke(now);
      }
    }
    return Promise.resolve();
  }
}
