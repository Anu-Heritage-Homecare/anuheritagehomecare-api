import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { HealthEvent } from '@modules/care-recipients/domain/health-event.entity';
import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';
import { HealthEventRepository } from '@modules/care-recipients/domain/health-event.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AddHealthEventUseCase } from './add-health-event.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

class EventStore implements HealthEventRepository {
  public readonly events: HealthEvent[] = [];
  add(event: HealthEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

describe('AddHealthEventUseCase', () => {
  it('records a health event attributed to the admin', async () => {
    const store = new EventStore();
    const useCase = new AddHealthEventUseCase(recipients(true), store, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      category: HealthEventCategory.Incident,
      title: 'Fall Incident',
      description: 'Minor fall in bathroom. No injury.',
      recordedByName: 'Sarah Williams',
      recordedByRole: 'Caregiver',
      occurredAt: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(store.events).toHaveLength(1);
    expect(store.events[0].id).toBe(id);
    expect(store.events[0].category).toBe(HealthEventCategory.Incident);
    expect(store.events[0].recordedByName).toBe('Sarah Williams');
    expect(store.events[0].authorAdminId).toBe('admin-1');
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new AddHealthEventUseCase(recipients(false), new EventStore(), clock, ids());
    await expect(
      useCase.execute({
        recipientId: 'nope',
        adminId: 'admin-1',
        category: HealthEventCategory.Care,
        title: 'x',
        description: 'y',
        occurredAt: NOW,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
