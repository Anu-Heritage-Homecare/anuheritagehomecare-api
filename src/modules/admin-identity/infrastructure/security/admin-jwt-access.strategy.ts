import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AdminAuthConfig } from '@config/configuration';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminAccessTokenClaims } from '../../application/ports/token-service.port';
import { AdminRole } from '../../domain/admin-role.enum';

/** The authenticated admin attached to the request by the admin access strategy. */
export interface AuthenticatedAdmin {
  adminUserId: string;
  role: AdminRole;
  email: string;
  /** The admin session id from the token, used to flag the current device. */
  sessionId: string;
}

/**
 * Validates the bearer access token on admin routes against the admin access
 * secret. Registered under a distinct passport name (`admin-jwt-access`) so an
 * admin route can never be satisfied by a mobile app token, and the reverse.
 */
@Injectable()
export class AdminJwtAccessStrategy extends PassportStrategy(Strategy, 'admin-jwt-access') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<AdminAuthConfig>('adminAuth').accessSecret,
    });
  }

  validate(payload: AdminAccessTokenClaims): AuthenticatedAdmin {
    if (payload.typ !== 'admin-access') {
      throw new UnauthorizedException();
    }
    return {
      adminUserId: payload.sub,
      role: payload.role,
      email: payload.email,
      sessionId: payload.sid,
    };
  }
}
