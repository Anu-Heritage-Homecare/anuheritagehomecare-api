import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ValidationException } from '@shared/domain/domain-exception';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import {
  VERIFICATION_CODE_REPOSITORY,
  VerificationCodeRepository,
} from '../../domain/verification-code.repository';
import { VerifyPasswordResetOtpCommand } from '../commands/verify-password-reset-otp.command';
import { ResetTokenResult } from '../dto/reset-token.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';

const INVALID = 'Invalid or expired reset code';

/**
 * Use case: verify a password reset passcode. On success the code is consumed
 * and a short lived reset token is returned; that token, not the code, then
 * authorises the actual password change.
 */
@Injectable()
export class VerifyPasswordResetOtpUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY) private readonly codes: VerificationCodeRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async execute(command: VerifyPasswordResetOtpCommand): Promise<ResetTokenResult> {
    const email = EmailAddress.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (user === null) {
      throw new ValidationException(INVALID);
    }

    const now = this.clock.now();
    const code = await this.codes.findLatestActive(user.id, VerificationPurpose.PasswordReset, now);
    if (code === null) {
      throw new ValidationException(INVALID);
    }

    const maxAttempts = this.config.getOrThrow<OtpConfig>('otp').maxAttempts;
    code.assertVerifiable(now, maxAttempts);

    const matches = await this.hasher.compare(command.code, code.codeHash);
    if (!matches) {
      code.recordFailedAttempt();
      await this.codes.save(code);
      throw new ValidationException(INVALID);
    }

    code.consume(now);
    await this.codes.save(code);

    const resetToken = await this.tokens.signResetToken({ sub: user.id });
    return { resetToken };
  }
}
