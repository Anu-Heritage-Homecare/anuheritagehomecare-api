import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for admin back office routes. Delegates to the `admin-jwt-access` passport
 * strategy registered by the admin identity context; a missing, malformed or
 * expired admin token yields a 401 before the handler runs. A mobile app token
 * cannot satisfy it (different secret and strategy). Lives in the shared kernel so
 * every admin bounded context protects its routes uniformly.
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt-access') {}
