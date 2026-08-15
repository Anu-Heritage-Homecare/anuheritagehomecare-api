import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for routes that require a valid access token. Delegates to the
 * `jwt-access` passport strategy registered by the identity context; a missing,
 * malformed or expired token yields a 401 before the handler runs. Lives in the
 * shared kernel so every bounded context can protect its routes uniformly.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {}
