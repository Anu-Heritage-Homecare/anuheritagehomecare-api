import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  ActivityEventView,
  RecipientActivityReadModel,
} from '../ports/recipient-activity-read.port';
import { GetRecipientActivityUseCase } from './get-recipient-activity.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) =>
      Promise.resolve(exists && id === R ? ({ id } as unknown as CareRecipient) : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

const EVENTS: ActivityEventView[] = [
  {
    id: 'visit-in:1',
    occurredAt: new Date('2026-07-24T10:15:00.000Z'),
    category: 'VISITS',
    type: 'VISIT_STARTED',
    title: 'Visit Started',
    description: 'Clocked in for personal care visit. Verified location check.',
    performedByName: 'Sarah Williams',
    performedByRole: 'Caregiver',
  },
  {
    id: 'med:2',
    occurredAt: new Date('2026-07-24T09:28:00.000Z'),
    category: 'MEDICAL',
    type: 'MEDICATION_ADMINISTERED',
    title: 'Medication Administered',
    description: 'Donepezil 10mg marked as given.',
    performedByName: 'Sarah Williams',
    performedByRole: 'Caregiver',
  },
  {
    id: 'care-plan:3',
    occurredAt: new Date('2026-07-23T11:00:00.000Z'),
    category: 'ADMINISTRATIVE',
    type: 'CARE_PLAN_UPDATED',
    title: 'Care Plan Updated',
    description: 'Adjusted Wednesday schedule to accommodate caregiver shift overlap.',
    performedByName: 'Mike Chen',
    performedByRole: 'Coordinator',
  },
];

class FakeReadModel implements RecipientActivityReadModel {
  public since: Date | null = null;
  constructor(private readonly events: ActivityEventView[] = EVENTS) {}
  listSince(_id: string, since: Date): Promise<ActivityEventView[]> {
    this.since = since;
    return Promise.resolve(this.events);
  }
}

function baseQuery(): Parameters<GetRecipientActivityUseCase['execute']>[0] {
  return {
    recipientId: R,
    category: null,
    user: null,
    search: null,
    days: 7,
    page: 1,
    pageSize: 20,
  };
}

describe('GetRecipientActivityUseCase', () => {
  it('returns the feed, the window and the distinct user list', async () => {
    const useCase = new GetRecipientActivityUseCase(recipients(true), new FakeReadModel(), clock);
    const result = await useCase.execute(baseQuery());

    expect(result.windowDays).toBe(7);
    expect(result.users).toEqual(['Mike Chen', 'Sarah Williams']);
    expect(result.page.total).toBe(3);
    expect(result.page.items[0].id).toBe('visit-in:1');
  });

  it('asks the read model for the window start', async () => {
    const readModel = new FakeReadModel();
    const useCase = new GetRecipientActivityUseCase(recipients(true), readModel, clock);
    await useCase.execute({ ...baseQuery(), days: 7 });
    expect(readModel.since).toEqual(new Date('2026-07-17T12:00:00.000Z'));
  });

  it('caps an oversized window to a year', async () => {
    const readModel = new FakeReadModel();
    const useCase = new GetRecipientActivityUseCase(recipients(true), readModel, clock);
    const result = await useCase.execute({ ...baseQuery(), days: 100_000 });
    expect(result.windowDays).toBe(365);
    expect(readModel.since).toEqual(new Date('2025-07-24T12:00:00.000Z'));
  });

  it('filters by category', async () => {
    const useCase = new GetRecipientActivityUseCase(recipients(true), new FakeReadModel(), clock);
    const result = await useCase.execute({ ...baseQuery(), category: 'MEDICAL' });
    expect(result.page.items).toHaveLength(1);
    expect(result.page.items[0].type).toBe('MEDICATION_ADMINISTERED');
    // The user list still reflects the whole window, not the category filter.
    expect(result.users).toEqual(['Mike Chen', 'Sarah Williams']);
  });

  it('filters by performer and by search text', async () => {
    const useCase = new GetRecipientActivityUseCase(recipients(true), new FakeReadModel(), clock);

    const byUser = await useCase.execute({ ...baseQuery(), user: 'Mike Chen' });
    expect(byUser.page.items).toHaveLength(1);
    expect(byUser.page.items[0].id).toBe('care-plan:3');

    const bySearch = await useCase.execute({ ...baseQuery(), search: 'donepezil' });
    expect(bySearch.page.items).toHaveLength(1);
    expect(bySearch.page.items[0].id).toBe('med:2');
  });

  it('paginates the filtered feed', async () => {
    const useCase = new GetRecipientActivityUseCase(recipients(true), new FakeReadModel(), clock);
    const result = await useCase.execute({ ...baseQuery(), pageSize: 2, page: 2 });
    expect(result.page.total).toBe(3);
    expect(result.page.totalPages).toBe(2);
    expect(result.page.items).toHaveLength(1);
    expect(result.page.items[0].id).toBe('care-plan:3');
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientActivityUseCase(recipients(false), new FakeReadModel(), clock);
    await expect(useCase.execute({ ...baseQuery(), recipientId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
