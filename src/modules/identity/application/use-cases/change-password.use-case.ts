import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { Password } from '../../domain/value-objects/password.vo';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TokenIssuerService } from '../services/token-issuer.service';

/**
 * Use case: an authenticated user sets a new password.
 *
 * This backs both a voluntary change and the forced first login change for an
 * account provisioned with a temporary password. The current password must be
 * proven before the change, the new password is validated against the policy and
 * must differ from the current one, and a successful change clears any pending
 * must change requirement. Every existing refresh token is revoked so other
 * sessions are logged out, and a fresh token pair is issued so the caller stays
 * signed in with the new credentials.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<AuthTokensResult> {
    const newPassword = Password.create(command.newPassword);

    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const currentMatches = await this.hasher.compare(command.currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw new UnauthorizedDomainException('The current password is incorrect');
    }

    if (command.newPassword === command.currentPassword) {
      throw new ValidationException('The new password must be different from the current password');
    }

    const passwordHash = await this.hasher.hash(newPassword.value);
    const now = this.clock.now();

    user.changePassword(passwordHash, now);
    await this.users.save(user);
    // Log out every device, then sign the caller back in on a fresh session.
    await this.sessions.revokeAllForUser(user.id, now);

    return this.tokenIssuer.issueForNewSession(user, command.device);
  }
}
