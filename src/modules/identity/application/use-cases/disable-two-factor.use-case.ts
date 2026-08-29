import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException, ValidationException } from '@shared/domain/domain-exception';
import {
  TWO_FACTOR_RECOVERY_CODE_REPOSITORY,
  TwoFactorRecoveryCodeRepository,
} from '../../domain/two-factor-recovery-code.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { MessageResult } from '../dto/message.result';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';

export interface DisableTwoFactorCommand {
  userId: string;
  password: string;
}

/**
 * Use case: turn two factor authentication off. The current password must be
 * proven first, since disabling it lowers the account's security. The stored
 * secret and every recovery code are forgotten.
 */
@Injectable()
export class DisableTwoFactorUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TWO_FACTOR_RECOVERY_CODE_REPOSITORY)
    private readonly recoveryCodes: TwoFactorRecoveryCodeRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DisableTwoFactorCommand): Promise<MessageResult> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const passwordMatches = await this.hasher.compare(command.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedDomainException('The current password is incorrect');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationException('Two factor authentication is not enabled');
    }

    user.disableTwoFactor(this.clock.now());
    await this.users.save(user);
    await this.recoveryCodes.deleteForUser(user.id);

    return { message: 'Two factor authentication has been disabled' };
  }
}
