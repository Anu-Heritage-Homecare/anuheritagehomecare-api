import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminPrincipal } from './admin-principal';

/**
 * Injects the authenticated admin from the request. Must only be used on routes
 * protected by AdminJwtAuthGuard; if the guard did not populate the principal this
 * raises rather than returning an undefined admin, so a misconfigured route fails
 * loudly instead of silently trusting an anonymous caller.
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminPrincipal => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AdminPrincipal }>();
    if (!request.user) {
      throw new InternalServerErrorException('CurrentAdmin used on an unauthenticated route');
    }
    return request.user;
  },
);
