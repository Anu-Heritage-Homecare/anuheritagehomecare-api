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
import { VerifyEmailCommand } from '../commands/verify-email.command';
import { MessageResult } from '../dto/message.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';

// A single opaque message for every failure so the endpoint never reveals which
// specific condition (unknown account, wrong code, expired code) was hit.
const INVALID = 'Invalid or expired verification code';

/**
 * Use case: verify a user's email using the emailed one time passcode. On
 * success the account is marked verified and promoted to active.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY) private readonly codes: VerificationCodeRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<MessageResult> {
    const email = EmailAddress.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (user === null) {
      throw new ValidationException(INVALID);
    }
    if (user.emailVerified) {
      return { message: 'Email address is already verified' };
    }

    const now = this.clock.now();
    const code = await this.codes.findLatestActive(
      user.id,
      VerificationPurpose.EmailVerification,
      now,
    );
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

    user.markEmailVerified(now);
    await this.users.save(user);
    user.clearDomainEvents();

    return { message: 'Email address verified successfully' };
  }
}
