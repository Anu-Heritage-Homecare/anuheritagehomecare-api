import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ApiKey } from '../../domain/api-key.entity';
import { API_KEY_REPOSITORY, ApiKeyRepository } from '../../domain/api-key.repository';
import { ApiKeyCreatedResult, ApiKeyResult, toApiKeyResult } from '../dto/api-key.result';
import { generateApiKeySecret, hashApiKeySecret } from './api-key-secret';

export interface CreateApiKeyCommand {
  name: string;
  scopes: string[];
  rateLimitPerHour?: number;
  createdById: string;
}

/** Use case: issue a new API key, returning its secret exactly once. */
@Injectable()
export class CreateApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<ApiKeyCreatedResult> {
    const now = this.clock.now();
    const { secret, keyPrefix, last4 } = generateApiKeySecret();
    const apiKey = ApiKey.create({
      id: this.ids.generate(),
      name: command.name,
      keyPrefix,
      last4,
      keyHash: hashApiKeySecret(secret),
      scopes: command.scopes,
      rateLimitPerHour: command.rateLimitPerHour,
      createdById: command.createdById,
      now,
    });
    await this.keys.save(apiKey);
    return { key: toApiKeyResult(apiKey, now), secret };
  }
}

/** Use case: list every API key for the API Keys section (no secrets). */
@Injectable()
export class ListApiKeysUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(): Promise<ApiKeyResult[]> {
    const now = this.clock.now();
    const keys = await this.keys.list();
    return keys.map((key) => toApiKeyResult(key, now));
  }
}

/** Use case: fetch one API key for the details drawer. */
@Injectable()
export class GetApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<ApiKeyResult> {
    const apiKey = await this.keys.findById(id);
    if (apiKey === null) {
      throw new NotFoundDomainException('API key not found');
    }
    return toApiKeyResult(apiKey, this.clock.now());
  }
}

/** Use case: rotate an API key's secret (the Regenerate action). */
@Injectable()
export class RegenerateApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<ApiKeyCreatedResult> {
    const now = this.clock.now();
    const apiKey = await this.keys.findById(id);
    if (apiKey === null) {
      throw new NotFoundDomainException('API key not found');
    }
    const { secret, keyPrefix, last4 } = generateApiKeySecret();
    apiKey.regenerate(keyPrefix, last4, hashApiKeySecret(secret), now);
    await this.keys.save(apiKey);
    return { key: toApiKeyResult(apiKey, now), secret };
  }
}

/** Use case: permanently revoke an API key (the Revoke action). */
@Injectable()
export class RevokeApiKeyUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly keys: ApiKeyRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(id: string): Promise<ApiKeyResult> {
    const now = this.clock.now();
    const apiKey = await this.keys.findById(id);
    if (apiKey === null) {
      throw new NotFoundDomainException('API key not found');
    }
    apiKey.revoke(now);
    await this.keys.save(apiKey);
    return toApiKeyResult(apiKey, now);
  }
}
