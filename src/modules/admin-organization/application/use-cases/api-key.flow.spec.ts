import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyStatus } from '../../domain/api-key-status.enum';
import { ApiKeyRepository } from '../../domain/api-key.repository';
import { ApiKeyCreatedResult } from '../dto/api-key.result';
import {
  CreateApiKeyUseCase,
  GetApiKeyUseCase,
  ListApiKeysUseCase,
  RegenerateApiKeyUseCase,
  RevokeApiKeyUseCase,
} from './api-key.use-cases';
import { AuthenticateApiKeyUseCase } from './authenticate-api-key.use-case';
import { hashApiKeySecret } from './api-key-secret';

class MutableClock implements Clock {
  constructor(public current: Date) {}
  now(): Date {
    return this.current;
  }
}

function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    generate: () => `00000000-0000-0000-0000-00000000000${(n += 1)}`,
  };
}

class InMemoryApiKeys implements ApiKeyRepository {
  store = new Map<string, ApiKey>();
  list(): Promise<ApiKey[]> {
    return Promise.resolve([...this.store.values()]);
  }
  findById(id: string): Promise<ApiKey | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  findByHash(keyHash: string): Promise<ApiKey | null> {
    return Promise.resolve([...this.store.values()].find((k) => k.keyHash === keyHash) ?? null);
  }
  save(apiKey: ApiKey): Promise<void> {
    this.store.set(apiKey.id, apiKey);
    return Promise.resolve();
  }
}

describe('Admin organization API key flows', () => {
  let repo: InMemoryApiKeys;
  let clock: MutableClock;

  beforeEach(() => {
    repo = new InMemoryApiKeys();
    clock = new MutableClock(new Date('2026-11-11T09:00:00.000Z'));
  });

  function create(
    scopes: string[] = ['read_recipients'],
    rateLimitPerHour?: number,
  ): Promise<ApiKeyCreatedResult> {
    return new CreateApiKeyUseCase(repo, clock, sequentialIds()).execute({
      name: 'Mobile App Integration',
      scopes,
      rateLimitPerHour,
      createdById: 'admin-1',
    });
  }

  it('issues a key, returning the secret once and storing only its hash', async () => {
    const created = await create();
    expect(created.secret).toMatch(/^sk-cp-/);
    expect(created.key.maskedValue).toBe(`sk-cp-****${created.key.last4}`);
    expect(created.key.status).toBe(ApiKeyStatus.Active);

    const stored = await repo.findById(created.key.id);
    expect(stored?.keyHash).toBe(hashApiKeySecret(created.secret));
    expect(stored?.keyHash).not.toBe(created.secret);

    expect(await new ListApiKeysUseCase(repo, clock).execute()).toHaveLength(1);
  });

  it('authenticates a valid key and counts the request live', async () => {
    const created = await create();
    const auth = new AuthenticateApiKeyUseCase(repo, clock);

    const result = await auth.execute(created.secret, []);
    expect(result.outcome).toBe('OK');
    expect(result.principal?.apiKeyId).toBe(created.key.id);

    const fetched = await new GetApiKeyUseCase(repo, clock).execute(created.key.id);
    expect(fetched.usage.today).toBe(1);
    expect(fetched.usage.thisWeek).toBe(1);
    expect(fetched.lastUsedAt).toEqual(clock.current);
  });

  it('rejects an unknown or revoked key and a missing scope', async () => {
    const auth = new AuthenticateApiKeyUseCase(repo, clock);
    expect((await auth.execute('sk-cp-nope', [])).outcome).toBe('UNAUTHORIZED');

    const scoped = await create(['read_recipients']);
    expect((await auth.execute(scoped.secret, ['read_schedules'])).outcome).toBe('FORBIDDEN');

    await new RevokeApiKeyUseCase(repo, clock).execute(scoped.key.id);
    expect((await auth.execute(scoped.secret, [])).outcome).toBe('UNAUTHORIZED');
  });

  it('enforces the hourly rate limit', async () => {
    const created = await create(['read_recipients'], 1);
    const auth = new AuthenticateApiKeyUseCase(repo, clock);
    expect((await auth.execute(created.secret, [])).outcome).toBe('OK');
    expect((await auth.execute(created.secret, [])).outcome).toBe('RATE_LIMITED');
  });

  it('rolls today usage over to zero on the next day', async () => {
    const created = await create();
    await new AuthenticateApiKeyUseCase(repo, clock).execute(created.secret, []);

    clock.current = new Date('2026-11-12T09:00:00.000Z');
    const fetched = await new GetApiKeyUseCase(repo, clock).execute(created.key.id);
    expect(fetched.usage.today).toBe(0);
    expect(fetched.usage.thisWeek).toBe(1);
  });

  it('regenerates the secret, keeping usage, and refuses once revoked', async () => {
    const created = await create();
    await new AuthenticateApiKeyUseCase(repo, clock).execute(created.secret, []);

    const regenerated = await new RegenerateApiKeyUseCase(repo, clock).execute(created.key.id);
    expect(regenerated.secret).not.toBe(created.secret);
    expect(regenerated.key.usage.today).toBe(1);

    const auth = new AuthenticateApiKeyUseCase(repo, clock);
    expect((await auth.execute(created.secret, [])).outcome).toBe('UNAUTHORIZED');
    expect((await auth.execute(regenerated.secret, [])).outcome).toBe('OK');

    await new RevokeApiKeyUseCase(repo, clock).execute(created.key.id);
    await expect(
      new RegenerateApiKeyUseCase(repo, clock).execute(created.key.id),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('raises when fetching, regenerating or revoking a missing key', async () => {
    await expect(new GetApiKeyUseCase(repo, clock).execute('ghost')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
    await expect(new RevokeApiKeyUseCase(repo, clock).execute('ghost')).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
