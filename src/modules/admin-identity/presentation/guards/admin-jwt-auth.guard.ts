import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for admin back office routes. Delegates to the `admin-jwt-access` passport
 * strategy; a missing, malformed or expired admin token yields a 401 before the
 * handler runs. A mobile app token cannot satisfy it, since it is signed with a
 * different secret and verified under a different strategy.
 */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt-access') {}
