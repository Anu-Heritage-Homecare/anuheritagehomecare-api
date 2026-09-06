import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { DeviceSession } from '../../domain/device-session.entity';
import {
  DEVICE_SESSION_REPOSITORY,
  DeviceSessionRepository,
} from '../../domain/device-session.repository';
import { User } from '../../domain/user.entity';
import { AuthTokensResult } from '../dto/auth-tokens.result';
import { DeviceContext } from '../dto/device-context';
import { toUserProfile } from '../dto/user-profile.result';
import { TOKEN_SERVICE, TokenService } from '../ports/token-service.port';

/**
 * Mints an access token and a rotating refresh token for a user, binding the
 * refresh token hash to a device session. Shared by login, two factor login,
 * refresh and password change so the token issuing logic exists once. The access
 * token carries the session id (`sid`) so the current device can be identified.
 */
@Injectable()
export class TokenIssuerService {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    @Inject(DEVICE_SESSION_REPOSITORY) private readonly sessions: DeviceSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /** Open a new session for a device and issue the first token pair against it. */
  async issueForNewSession(user: User, device: DeviceContext): Promise<AuthTokensResult> {
    const session = DeviceSession.start({
      id: this.ids.generate(),
      userId: user.id,
      deviceLabel: device.deviceLabel,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      now: this.clock.now(),
    });
    return this.issueForSession(user, session);
  }

  /** Rotate the refresh token of an existing session and issue a fresh pair. */
  async issueForSession(user: User, session: DeviceSession): Promise<AuthTokensResult> {
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      userType: user.userType,
      country: user.address.country,
      email: user.email.value,
      sid: session.id,
    });
    const refresh = await this.tokens.signRefresh({ sub: user.id });

    session.rotateToken(refresh.tokenHash, refresh.expiresAt, this.clock.now());
    await this.sessions.save(session);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken: refresh.token,
      user: toUserProfile(user),
    };
  }
}
