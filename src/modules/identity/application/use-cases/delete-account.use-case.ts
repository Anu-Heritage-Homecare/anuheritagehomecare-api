import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { UnauthorizedDomainException } from '@shared/domain/domain-exception';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from '../ports/password-hasher.port';

export interface DeleteAccountCommand {
  userId: string;
  password: string;
}

/**
 * Use case: soft close the authenticated user's account (the Delete Account
 * action). The current password must be proven, since this is a high risk,
 * account wide action. The account is marked closed (login blocked) and every
 * session is revoked; the record and its history are retained, so support can
 * reverse it. A hard data purge, if ever required, is a separate office process.
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (user === null) {
      throw new UnauthorizedDomainException();
    }

    const matches = await this.hasher.compare(command.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedDomainException('The password is incorrect');
    }

    const now = this.clock.now();
    user.closeAccount(now);
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id, now);
  }
}
