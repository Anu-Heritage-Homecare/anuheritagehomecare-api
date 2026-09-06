import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  ADMIN_SESSION_REPOSITORY,
  AdminSessionRepository,
} from '../../domain/admin-session.repository';
import { ADMIN_USER_REPOSITORY, AdminUserRepository } from '../../domain/admin-user.repository';
import { Password } from '../../domain/value-objects/password.vo';
import { ChangeAdminPasswordCommand } from '../commands/change-admin-password.command';
import { AdminAuthTokensResult } from '../dto/admin-auth-tokens.result';
import { ADMIN_PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { AdminTokenIssuerService } from '../services/admin-token-issuer.service';

/**
 * Use case: an authenticated admin sets a new password.
 *
 * Backs both a voluntary change and the forced first login change for an account
 * provisioned with a temporary password. The current password must be proven, the
 * new password is validated against the policy and must differ from the current
 * one, and a successful change clears any pending must change requirement. Every
 * existing session is revoked so other devices are logged out, and a fresh token
 * pair is issued so the caller stays signed in with the new credentials.
 */
@Injectable()
export class ChangeAdminPasswordUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
    @Inject(ADMIN_PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ADMIN_SESSION_REPOSITORY) private readonly sessions: AdminSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: AdminTokenIssuerService,
  ) {}

  async execute(command: ChangeAdminPasswordCommand): Promise<AdminAuthTokensResult> {
    const newPassword = Password.create(command.newPassword);

    const admin = await this.admins.findById(command.adminUserId);
    if (admin === null) {
      throw new UnauthorizedDomainException();
    }

    const currentMatches = await this.hasher.compare(command.currentPassword, admin.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedDomainException('The current password is incorrect');
    }

    if (command.newPassword === command.currentPassword) {
      throw new ValidationException('The new password must be different from the current password');
    }

    const passwordHash = await this.hasher.hash(newPassword.value);
    const now = this.clock.now();

    admin.changePassword(passwordHash, now);
    await this.admins.save(admin);
    await this.sessions.revokeAllForAdmin(admin.id, now);

    return this.tokenIssuer.issueForNewSession(admin, command.device);
  }
}
