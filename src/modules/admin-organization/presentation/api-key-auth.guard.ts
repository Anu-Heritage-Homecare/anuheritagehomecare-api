import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  ApiKeyPrincipal,
  AuthenticateApiKeyUseCase,
} from '../application/use-cases/authenticate-api-key.use-case';

/** Metadata key carrying the scopes a route requires of the calling API key. */
export const REQUIRED_API_SCOPES = 'required_api_scopes';

/** Declare the scopes an API key must hold to call the decorated route. */
export const RequiresApiScope = (...scopes: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_API_SCOPES, scopes);

type AuthenticatedRequest = Request & { apiKey?: ApiKeyPrincipal };

/** Pull the presented secret from `x-api-key` or an `Authorization: Bearer` header. */
function extractSecret(request: Request): string | null {
  const header = request.headers['x-api-key'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || null;
  }
  return null;
}

/**
 * Authenticates external callers by API key. Reads the key from the request,
 * checks it against the required scopes and the key's hourly rate limit, records
 * the request against the key's live usage, and attaches the authenticated key to
 * the request. Fails closed: a missing or invalid key is 401, a missing scope 403,
 * an over limit key 429.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticate: AuthenticateApiKeyUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const secret = extractSecret(request);
    if (secret === null) {
      throw new UnauthorizedException('An API key is required');
    }
    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_API_SCOPES, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const result = await this.authenticate.execute(secret, requiredScopes);
    switch (result.outcome) {
      case 'OK':
        request.apiKey = result.principal ?? undefined;
        return true;
      case 'FORBIDDEN':
        throw new ForbiddenException('This API key lacks a required scope');
      case 'RATE_LIMITED':
        throw new HttpException('API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      default:
        throw new UnauthorizedException('Invalid API key');
    }
  }
}

/**
 * Injects the authenticated API key from the request. Only valid on routes behind
 * ApiKeyAuthGuard; raises if the guard did not populate it so a misconfigured
 * route fails loudly rather than trusting an anonymous caller.
 */
export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyPrincipal => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.apiKey) {
      throw new InternalServerErrorException('CurrentApiKey used on an unauthenticated route');
    }
    return request.apiKey;
  },
);
