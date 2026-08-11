import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
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
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LogoutCommand): Promise<MessageResult> {
    const tokenHash = this.tokens.hashToken(command.refreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);

    if (stored !== null) {
      stored.revoke(this.clock.now());
      await this.refreshTokens.save(stored);
    }

    return { message: 'Logged out' };
  }
}
