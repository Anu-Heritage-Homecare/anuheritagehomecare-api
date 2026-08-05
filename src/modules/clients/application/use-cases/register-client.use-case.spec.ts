import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { ConflictDomainException } from '@shared/domain/domain-exception';
import { Client } from '../../domain/client.entity';
import { ClientRepository } from '../../domain/client.repository';
import { ClientStatus } from '../../domain/client-status.enum';
import { RegisterClientUseCase } from './register-client.use-case';

/** Deterministic in memory double for the repository port. */
class InMemoryClientRepository implements ClientRepository {
  private readonly store = new Map<string, Client>();

  save(client: Client): Promise<void> {
    this.store.set(client.id, client);
    return Promise.resolve();
  }

  findById(id: string): Promise<Client | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  findByEmail(email: string): Promise<Client | null> {
    const found = [...this.store.values()].find((c) => c.email.value === email);
    return Promise.resolve(found ?? null);
  }

  existsByEmail(email: string): Promise<boolean> {
    return Promise.resolve([...this.store.values()].some((c) => c.email.value === email));
  }
}

describe('RegisterClientUseCase', () => {
  const fixedNow = new Date('2026-01-01T00:00:00.000Z');
  const clock: Clock = { now: () => fixedNow };
  const ids: IdGenerator = { generate: () => 'fixed-id-1' };

  let repository: InMemoryClientRepository;
  let useCase: RegisterClientUseCase;

  beforeEach(() => {
    repository = new InMemoryClientRepository();
    useCase = new RegisterClientUseCase(repository, clock, ids);
  });

  it('registers a new active client', async () => {
    const result = await useCase.execute({
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'ada.obi@example.com',
      phone: '+2348012345678',
    });

    expect(result.id).toBe('fixed-id-1');
    expect(result.status).toBe(ClientStatus.Active);
    expect(await repository.existsByEmail('ada.obi@example.com')).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    const command = {
      firstName: 'Ada',
      lastName: 'Obi',
      email: 'ada.obi@example.com',
      phone: '+2348012345678',
    };
    await useCase.execute(command);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(ConflictDomainException);
  });
});
