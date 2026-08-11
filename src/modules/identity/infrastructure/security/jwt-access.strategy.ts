import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthConfig } from '@config/configuration';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenClaims } from '../../application/ports/token-service.port';
import { UserType } from '../../domain/user-type.enum';

/** The authenticated principal attached to the request by the access strategy. */
export interface AuthenticatedUser {
  userId: string;
  userType: UserType;
}

/**
 * Validates the bearer access token on protected routes. Passport verifies the
 * signature and expiry against the access secret; this class asserts the token
 * type and projects the claims into a small principal.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<AuthConfig>('auth').accessSecret,
    });
  }

  validate(payload: AccessTokenClaims): AuthenticatedUser {
    if (payload.typ !== 'access') {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, userType: payload.userType };
  }
}
