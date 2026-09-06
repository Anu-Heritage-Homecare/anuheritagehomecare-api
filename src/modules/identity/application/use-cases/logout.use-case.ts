import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { LogoutCommand } from '../commands/logout.command';
import { MessageResult } from '../dto/message.result';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';

/**
 * Use case: revoke a refresh token on logout. Idempotent: an unknown or already
 * revoked token yields the same acknowledgement, so logout never errors.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LogoutCommand): Promise<MessageResult> {
    const tokenHash = this.tokens.hashToken(command.refreshToken);
    const session = await this.sessions.findByCurrentTokenHash(tokenHash);

    if (session !== null) {
      session.revoke(this.clock.now());
      await this.sessions.save(session);
    }

    return { message: 'Logged out' };
  }
}
