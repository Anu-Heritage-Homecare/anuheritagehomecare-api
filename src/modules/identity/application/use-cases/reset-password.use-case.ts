import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { Password } from '../../domain/value-objects/password.vo';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { MessageResult } from '../dto/message.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';

/**
 * Use case: set a new password using a reset token obtained by verifying the
 * emailed code. The new password overrides the old one and every existing
 * refresh token for the account is revoked, forcing a fresh login everywhere.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<MessageResult> {
    const claims = await this.tokens.verifyResetToken(command.resetToken);
    const newPassword = Password.create(command.newPassword);

    const user = await this.users.findById(claims.sub);
    if (user === null) {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }

    const passwordHash = await this.hasher.hash(newPassword.value);
    const now = this.clock.now();

    user.changePassword(passwordHash, now);
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id, now);

    return { message: 'Password has been reset. Please log in with your new password.' };
  }
}
