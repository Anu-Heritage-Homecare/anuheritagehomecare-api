import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import {
  ADMIN_SESSION_REPOSITORY,
  AdminSessionRepository,
} from '../../domain/admin-session.repository';
import { AdminStatus } from '../../domain/admin-status.enum';
import { ADMIN_USER_REPOSITORY, AdminUserRepository } from '../../domain/admin-user.repository';
import { RefreshAdminTokenCommand } from '../commands/refresh-admin-token.command';
import { AdminAuthTokensResult } from '../dto/admin-auth-tokens.result';
import { ADMIN_TOKEN_SERVICE, AdminTokenService } from '../ports/token-service.port';
import { AdminTokenIssuerService } from '../services/admin-token-issuer.service';

/**
 * Use case: exchange a valid admin refresh token for a new token pair. The
 * presented token is rotated (replaced), so a stolen and replayed token no longer
 * matches the session's current hash and is rejected as inactive.
 */
@Injectable()
export class RefreshAdminTokenUseCase {
  constructor(
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
    @Inject(ADMIN_SESSION_REPOSITORY) private readonly sessions: AdminSessionRepository,
    @Inject(ADMIN_TOKEN_SERVICE) private readonly tokens: AdminTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: AdminTokenIssuerService,
  ) {}

  async execute(command: RefreshAdminTokenCommand): Promise<AdminAuthTokensResult> {
    const claims = await this.tokens.verifyRefresh(command.refreshToken);
    const tokenHash = this.tokens.hashToken(command.refreshToken);
    const session = await this.sessions.findByCurrentTokenHash(tokenHash);
    const now = this.clock.now();

    if (session === null || !session.isActive(now) || session.adminUserId !== claims.sub) {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }

    const admin = await this.admins.findById(claims.sub);
    if (admin === null) {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    if (admin.status === AdminStatus.Suspended) {
      throw new ForbiddenDomainException('This account is suspended');
    }

    return this.tokenIssuer.issueForSession(admin, session);
  }
}
