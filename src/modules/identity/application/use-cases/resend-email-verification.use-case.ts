import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { ResendEmailVerificationCommand } from '../commands/resend-email-verification.command';
import { MessageResult } from '../dto/message.result';
import { OtpService } from '../services/otp.service';

// Identical response whether or not the account exists or is already verified,
// so the endpoint cannot be used to enumerate accounts.
const ACK = 'If an unverified account exists for that email, a new code has been sent';

/**
 * Use case: resend the email verification code. Silently does nothing for
 * unknown or already verified accounts while returning the same acknowledgement.
 */
@Injectable()
export class ResendEmailVerificationUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly otp: OtpService,
  ) {}

  async execute(command: ResendEmailVerificationCommand): Promise<MessageResult> {
    const email = EmailAddress.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (user !== null && !user.emailVerified) {
      await this.otp.issueAndSend(user, VerificationPurpose.EmailVerification);
    }

    return { message: ACK };
  }
}
