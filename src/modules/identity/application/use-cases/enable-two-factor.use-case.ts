import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { TwoFactorRecoveryCode } from '../../domain/two-factor-recovery-code.entity';
import {
  TWO_FACTOR_RECOVERY_CODE_REPOSITORY,
  TwoFactorRecoveryCodeRepository,
} from '../../domain/two-factor-recovery-code.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { TwoFactorRecoveryCodesResult } from '../dto/two-factor.result';
import { OTP_GENERATOR, OtpGenerator } from '../ports/otp-generator.port';
import { SECRET_CIPHER, SecretCipher } from '../ports/secret-cipher.port';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import {
  TWO_FACTOR_AUTHENTICATOR,
  TwoFactorAuthenticator,
} from '../ports/two-factor-authenticator.port';

export interface EnableTwoFactorCommand {
  userId: string;
  code: string;
}

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 10;

/**
 * Use case: activate two factor authentication after the user proves a valid
 * TOTP code against the pending secret. On success a fresh batch of single use
 * recovery codes is issued (replacing any earlier set) and returned once in the
 * clear; only their hashes are stored.
 */
@Injectable()
export class EnableTwoFactorUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TWO_FACTOR_AUTHENTICATOR) private readonly authenticator: TwoFactorAuthenticator,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipher,
    @Inject(OTP_GENERATOR) private readonly otp: OtpGenerator,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(TWO_FACTOR_RECOVERY_CODE_REPOSITORY)
    private readonly recoveryCodes: TwoFactorRecoveryCodeRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EnableTwoFactorCommand): Promise<TwoFactorRecoveryCodesResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    if (user.twoFactorEnabled) {
      throw new ValidationException('Two factor authentication is already enabled');
    }
    if (user.twoFactorSecret === null) {
      throw new ValidationException('Start two factor setup before enabling it');
    }

    const secret = this.cipher.decrypt(user.twoFactorSecret);
    const now = this.clock.now();
    if (!this.authenticator.verify({ secret, code: command.code, now })) {
      throw new UnauthorizedDomainException('Invalid authentication code');
    }

    const plainCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      this.otp.generateAlphanumeric(RECOVERY_CODE_LENGTH),
    );
    const codes = plainCodes.map((plain) =>
      TwoFactorRecoveryCode.issue({
        id: this.ids.generate(),
        userId: user.id,
        codeHash: this.tokens.hashToken(plain),
        now,
      }),
    );
    await this.recoveryCodes.replaceForUser(user.id, codes);

    user.enableTwoFactor(now);
    await this.users.save(user);

    return { recoveryCodes: plainCodes };
  }
}
