import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { API_KEY_REPOSITORY, ApiKeyRepository } from '../../domain/api-key.repository';
import { hashApiKeySecret } from './api-key-secret';

/** The authenticated key handed to a partner route handler. */
export interface ApiKeyPrincipal {
  apiKeyId: string;
  name: string;
  scopes: string[];
}

export type ApiKeyAuthOutcome = 'OK' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED';

export interface ApiKeyAuthResult {
  outcome: ApiKeyAuthOutcome;
  principal: ApiKeyPrincipal | null;
}

const UNAUTHORIZED: ApiKeyAuthResult = { outcome: 'UNAUTHORIZED', principal: null };

/**
 * Authenticate a presented secret for a route that requires `requiredScopes`, and
 * on success record the request against the key's live usage counters. The hash of
 * the presented secret is matched against stored hashes, so the raw key is never
 * compared in the clear. A revoked or unknown key is UNAUTHORIZED; a valid key
 * lacking a required scope is FORBIDDEN; a key over its hourly limit is
 * RATE_LIMITED. Only a granted request mutates (and persists) the key.
 *
 * shortcut: usage counting is read modify write, so two simultaneous requests on
 * one key can under count by one; upgrade to atomic DB increments (or a counter
 * store) when a single key sustains high concurrency.
 */
@Injectable()
export class AuthenticateApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    presentedSecret: string,
    requiredScopes: readonly string[],
  ): Promise<ApiKeyAuthResult> {
    const apiKey = await this.keys.findByHash(hashApiKeySecret(presentedSecret));
    if (apiKey === null) {
      return UNAUTHORIZED;
    }
    const authorization = apiKey.authorize(requiredScopes, this.clock.now());
    switch (authorization) {
      case 'OK':
        await this.keys.save(apiKey);
        return {
          outcome: 'OK',
          principal: { apiKeyId: apiKey.id, name: apiKey.name, scopes: [...apiKey.scopes] },
        };
      case 'FORBIDDEN_SCOPE':
        return { outcome: 'FORBIDDEN', principal: null };
      case 'RATE_LIMITED':
        return { outcome: 'RATE_LIMITED', principal: null };
      default:
        return UNAUTHORIZED;
    }
  }
}
