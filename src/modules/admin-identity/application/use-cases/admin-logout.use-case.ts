import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ADMIN_SESSION_REPOSITORY,
  AdminSessionRepository,
} from '../../domain/admin-session.repository';
import { AdminLogoutCommand } from '../commands/admin-logout.command';
import { ADMIN_TOKEN_SERVICE, AdminTokenService } from '../ports/token-service.port';

/**
 * Use case: sign an admin out of the current device by revoking the session
 * behind the presented refresh token. Idempotent: an unknown or already revoked
 * token is a no-op, so logout never leaks whether a token was valid.
 */
@Injectable()
export class AdminLogoutUseCase {
  constructor(
    @Inject(ADMIN_SESSION_REPOSITORY) private readonly sessions: AdminSessionRepository,
    @Inject(ADMIN_TOKEN_SERVICE) private readonly tokens: AdminTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AdminLogoutCommand): Promise<void> {
    const tokenHash = this.tokens.hashToken(command.refreshToken);
    const session = await this.sessions.findByCurrentTokenHash(tokenHash);
    if (session === null) {
      return;
    }
    session.revoke(this.clock.now());
    await this.sessions.save(session);
  }
}
