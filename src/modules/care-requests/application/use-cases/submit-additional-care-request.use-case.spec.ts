import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { AdditionalCareRequest } from '../../domain/additional-care-request.entity';
import { AdditionalCareRequestRepository } from '../../domain/additional-care-request.repository';
import { CareRecipientOwnerDirectory } from '../ports/care-recipient-owner-directory.port';
import { SubmitAdditionalCareRequestUseCase } from './submit-additional-care-request.use-case';

const FIXED_NOW = new Date('2026-08-24T12:00:00.000Z');
const clock: Clock = { now: () => FIXED_NOW };

function ids(prefix = 'req'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

class InMemoryRequests implements AdditionalCareRequestRepository {
  public store: AdditionalCareRequest[] = [];
  save(request: AdditionalCareRequest): Promise<void> {
    this.store.push(request);
    return Promise.resolve();
  }
  findById(id: string): Promise<AdditionalCareRequest | null> {
    return Promise.resolve(this.store.find((r) => r.id === id) ?? null);
  }
  listByCareRecipient(careRecipientId: string): Promise<AdditionalCareRequest[]> {
    return Promise.resolve(this.store.filter((r) => r.careRecipientId === careRecipientId));
  }
}

function ownerDirectory(map: Record<string, string>): CareRecipientOwnerDirectory {
  return { ownerOf: (id) => Promise.resolve(map[id] ?? null) };
}

const VALID = {
  ownerId: 'owner-1',
  careRecipientId: 'r1',
  careType: 'Overnight care',
  requestedDate: new Date('2026-09-01T00:00:00.000Z'),
  startMinute: 9 * 60,
  durationMinutes: 180,
  reason: 'Family travelling that week',
};

describe('SubmitAdditionalCareRequestUseCase', () => {
  let requests: InMemoryRequests;

  beforeEach(() => {
    requests = new InMemoryRequests();
  });

  it('stores a pending request for a recipient the owner has', async () => {
    const useCase = new SubmitAdditionalCareRequestUseCase(
      requests,
      ownerDirectory({ r1: 'owner-1' }),
      ids(),
      clock,
    );

    const result = await useCase.execute(VALID);

    expect(result.status).toBe('PENDING');
    expect(result.requestedDate).toBe('2026-09-01');
    expect(result.durationMinutes).toBe(180);
    expect(requests.store).toHaveLength(1);
  });

  it('hides a recipient the owner does not own', async () => {
    const useCase = new SubmitAdditionalCareRequestUseCase(
      requests,
      ownerDirectory({ r1: 'another-owner' }),
      ids(),
      clock,
    );

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects a requested date in the past', async () => {
    const useCase = new SubmitAdditionalCareRequestUseCase(
      requests,
      ownerDirectory({ r1: 'owner-1' }),
      ids(),
      clock,
    );

    await expect(
      useCase.execute({ ...VALID, requestedDate: new Date('2026-08-01T00:00:00.000Z') }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
