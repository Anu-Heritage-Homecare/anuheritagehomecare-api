import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedPrincipal } from './authenticated-principal';

/**
 * Injects the authenticated principal from the request. Must only be used on
 * routes protected by JwtAuthGuard; if the guard did not populate the principal
 * this raises rather than returning an undefined user, so a misconfigured route
 * fails loudly instead of silently trusting an anonymous caller.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedPrincipal => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedPrincipal }>();
    if (!request.user) {
      throw new InternalServerErrorException('CurrentUser used on an unauthenticated route');
    }
    return request.user;
  },
);
