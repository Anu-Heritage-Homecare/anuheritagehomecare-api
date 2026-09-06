import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { AdminSession } from '../../domain/admin-session.entity';
import {
  ADMIN_SESSION_REPOSITORY,
  AdminSessionRepository,
} from '../../domain/admin-session.repository';
import { AdminUser } from '../../domain/admin-user.entity';
import { AdminAuthTokensResult } from '../dto/admin-auth-tokens.result';
import { DeviceContext } from '../dto/device-context';
import { toAdminProfile } from '../dto/admin-profile.result';
import { ADMIN_TOKEN_SERVICE, AdminTokenService } from '../ports/token-service.port';

/**
 * Mints an access token and a rotating refresh token for an admin, binding the
 * refresh token hash to a session. Shared by login, refresh and password change
 * so the token issuing logic exists once. The access token carries the session id
 * (`sid`) so the current device can be identified.
 */
@Injectable()
export class AdminTokenIssuerService {
  constructor(
    @Inject(ADMIN_TOKEN_SERVICE) private readonly tokens: AdminTokenService,
    @Inject(ADMIN_SESSION_REPOSITORY) private readonly sessions: AdminSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  /** Open a new session for a device and issue the first token pair against it. */
  async issueForNewSession(
    admin: AdminUser,
    device: DeviceContext,
  ): Promise<AdminAuthTokensResult> {
    const session = AdminSession.start({
      id: this.ids.generate(),
      adminUserId: admin.id,
      deviceLabel: device.deviceLabel,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      now: this.clock.now(),
    });
    return this.issueForSession(admin, session);
  }

  /** Rotate the refresh token of an existing session and issue a fresh pair. */
  async issueForSession(admin: AdminUser, session: AdminSession): Promise<AdminAuthTokensResult> {
    const accessToken = await this.tokens.signAccess({
      sub: admin.id,
      role: admin.role,
      email: admin.email.value,
      sid: session.id,
    });
    const refresh = await this.tokens.signRefresh({ sub: admin.id });

    session.rotateToken(refresh.tokenHash, refresh.expiresAt, this.clock.now());
    await this.sessions.save(session);

    return {
      tokenType: 'Bearer',
      accessToken,
      refreshToken: refresh.token,
      admin: toAdminProfile(admin),
    };
  }
}
