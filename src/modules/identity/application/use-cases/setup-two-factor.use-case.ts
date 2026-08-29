import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { TwoFactorSetupResult } from '../dto/two-factor.result';
import { SECRET_CIPHER, SecretCipher } from '../ports/secret-cipher.port';
import {
  TWO_FACTOR_AUTHENTICATOR,
  TwoFactorAuthenticator,
} from '../ports/two-factor-authenticator.port';

export interface SetupTwoFactorCommand {
  userId: string;
}

/**
 * Use case: begin two factor setup for the authenticated user. Generates a fresh
 * TOTP secret, stores it encrypted (not yet active), and returns the secret and
 * the otpauth URI so the app can show a QR code. The user must then prove a code
 * to actually enable it.
 */
@Injectable()
export class SetupTwoFactorUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TWO_FACTOR_AUTHENTICATOR) private readonly authenticator: TwoFactorAuthenticator,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SetupTwoFactorCommand): Promise<TwoFactorSetupResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }
    if (user.twoFactorEnabled) {
      throw new ValidationException('Two factor authentication is already enabled');
    }

    const secret = this.authenticator.generateSecret();
    user.beginTwoFactorSetup(this.cipher.encrypt(secret), this.clock.now());
    await this.users.save(user);

    return {
      secret,
      otpauthUri: this.authenticator.keyUri(secret, user.email.value),
    };
  }
}
