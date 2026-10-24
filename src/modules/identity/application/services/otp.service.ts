import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpConfig } from '@config/configuration';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { User } from '../../domain/user.entity';
import { VerificationPurpose } from '../../domain/verification-purpose.enum';
import { VerificationCode } from '../../domain/verification-code.entity';
import {
  VERIFICATION_CODE_REPOSITORY,
  VerificationCodeRepository,
} from '../../domain/verification-code.repository';
import { EMAIL_SENDER, EmailSender } from '../ports/email-sender.port';
import { OTP_GENERATOR, OtpGenerator } from '../ports/otp-generator.port';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';

interface EmailCopy {
  subject: string;
  intro: string;
}

const COPY: Record<VerificationPurpose, EmailCopy> = {
  [VerificationPurpose.EmailVerification]: {
    subject: 'Verify your email address',
    intro: 'Use the code below to verify your email address.',
  },
  [VerificationPurpose.PasswordReset]: {
    subject: 'Reset your password',
    intro: 'Use the code below to reset your password.',
  },
};

/**
 * Issues a fresh one time passcode for a purpose and emails it. Shared by
 * registration, resend and password reset so the "generate, hash, store, send"
 * sequence lives in exactly one place. Any outstanding code for the same user
 * and purpose is cleared first so only one code is ever valid.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly codes: VerificationCodeRepository,
    @Inject(OTP_GENERATOR) private readonly otp: OtpGenerator,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    private readonly config: ConfigService,
  ) {}

  async issueAndSend(user: User, purpose: VerificationPurpose): Promise<void> {
    const otpConfig = this.config.getOrThrow<OtpConfig>('otp');

    // TEMPORARY stopgap (OTP_BYPASS_ENABLED): SMTP is not provisioned yet, so use a
    // fixed all zeros passcode and skip delivery entirely. Verification accepts it
    // through the normal hash compare. Disable once real SMTP credentials exist.
    const code = otpConfig.bypassEnabled
      ? '0'.repeat(otpConfig.length)
      : this.otp.generateNumeric(otpConfig.length);
    const codeHash = await this.hasher.hash(code);

    await this.codes.deleteActiveByUserAndPurpose(user.id, purpose);

    const verificationCode = VerificationCode.issue({
      id: this.ids.generate(),
      userId: user.id,
      purpose,
      codeHash,
      now: this.clock.now(),
      ttlMinutes: otpConfig.ttlMinutes,
    });
    await this.codes.save(verificationCode);

    if (otpConfig.bypassEnabled) {
      // No email address or code is logged, only that the bypass is active.
      this.logger.warn(
        `OTP email delivery is bypassed (OTP_BYPASS_ENABLED); no ${purpose} email sent`,
      );
      return;
    }

    const copy = COPY[purpose];
    const text =
      `Hello ${user.name.firstName},\n\n` +
      `${copy.intro}\n\n` +
      `${code}\n\n` +
      `This code expires in ${otpConfig.ttlMinutes} minutes. ` +
      `If you did not request this, you can safely ignore this email.`;

    await this.email.send({ to: user.email.value, subject: copy.subject, text });
  }
}
