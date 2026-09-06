import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  ForbiddenDomainException,
  UnauthorizedDomainException,
} from '@shared/domain/domain-exception';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { UserStatus } from '../../domain/user-status.enum';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';
import { RefreshTokenCommand } from '../commands/refresh-token.command';
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';
import { TokenIssuerService } from '../services/token-issuer.service';

/**
 * Use case: exchange a valid refresh token for a new access and refresh token
 * pair. The presented token is rotated (revoked and replaced), so a stolen and
 * replayed token is detected as inactive.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly tokenIssuer: TokenIssuerService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthTokensResult> {
    const claims = await this.tokens.verifyRefresh(command.refreshToken);
    const tokenHash = this.tokens.hashToken(command.refreshToken);
    const session = await this.sessions.findByCurrentTokenHash(tokenHash);
    const now = this.clock.now();

    // A replayed, rotated token no longer matches the session's current hash.
    if (session === null || !session.isActive(now) || session.userId !== claims.sub) {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }

    const user = await this.users.findById(claims.sub);
    if (user === null) {
      throw new UnauthorizedDomainException('Invalid or expired token');
    }
    if (user.status === UserStatus.Suspended) {
      throw new ForbiddenDomainException('This account is suspended');
    }

    // Rotate in place: the presented token is replaced, so it can never be reused.
    return this.tokenIssuer.issueForSession(user, session);
  }
}
