import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { RequestPasswordResetCommand } from '../commands/request-password-reset.command';
import { MessageResult } from '../dto/message.result';
import { OtpService } from '../services/otp.service';

// Same acknowledgement for known and unknown accounts to prevent enumeration.
const ACK = 'If an account exists for that email, a reset code has been sent';

/**
 * Use case: begin the forgot password flow by emailing a one time passcode.
 * Returns the same acknowledgement regardless of whether the account exists.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly otp: OtpService,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<MessageResult> {
    const email = EmailAddress.create(command.email);
    const user = await this.users.findByEmail(email.value);

    if (user !== null) {
      await this.otp.issueAndSend(user, VerificationPurpose.PasswordReset);
    }

    return { message: ACK };
  }
}
