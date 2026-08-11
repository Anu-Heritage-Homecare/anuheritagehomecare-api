import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { RefreshToken } from '../../domain/refresh-token.entity';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
} from '../../domain/refresh-token.repository';
import { User } from '../../domain/user.entity';
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { toUserProfile } from '../dto/user-profile.result';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';

/**
 * Mints an access token and a rotating refresh token for a user and persists the
 * refresh token hash. Shared by the login and refresh use cases so the token
 * issuing logic exists once.
 */
@Injectable()
export class TokenIssuerService {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async issueFor(user: User): Promise<AuthTokensResult> {
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      userType: user.userType,
    });
    const refresh = await this.tokens.signRefresh({ sub: user.id });

    const stored = RefreshToken.issue({
      id: this.ids.generate(),
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      now: this.clock.now(),
    });
    await this.refreshTokens.save(stored);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken: refresh.token,
      user: toUserProfile(user),
    };
  }
}
