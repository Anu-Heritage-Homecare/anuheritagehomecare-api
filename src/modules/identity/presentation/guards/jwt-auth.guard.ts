import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for routes that require a valid access token. Delegates to the
 * `jwt-access` passport strategy; a missing, malformed or expired token yields a
 * 401 before the handler runs.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {}
