import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentRepository } from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import { CareTeamAssignmentEventRepository } from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { CoverageBlock } from '@modules/care-recipients/domain/coverage-block.entity';
import { CoverageBlockRepository } from '@modules/care-recipients/domain/coverage-block.repository';
import { CoverageSlot } from '@modules/care-recipients/domain/coverage-slot.enum';
import { RecipientProfile } from '@modules/care-recipients/domain/value-objects/recipient-profile.vo';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AssignCaregiverUseCase } from './assign-caregiver.use-case';
import { RemoveCaregiverUseCase } from './remove-caregiver.use-case';
import { ReviseCaregiverAssignmentUseCase } from './revise-caregiver-assignment.use-case';
import { SetCoverageUseCase } from './set-coverage.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

function makeRecipient(): CareRecipient {
  const profile = RecipientProfile.create({
    name: 'Margaret Johnson',
    gender: 'FEMALE',
    dateOfBirth: new Date('1948-01-01T00:00:00.000Z'),
    city: 'Boston',
    state: 'MA',
    fullAddress: '1 Main St',
    relationship: 'Mother',
    livingSituation: 'At home',
    photoKey: null,
    latitude: null,
    longitude: null,
  });
  return CareRecipient.provisionByAdmin({ id: R, ownerId: 'owner1', profile, now: NOW });
}

class RecipientStore implements CareRecipientRepository {
  constructor(private recipient: CareRecipient | null) {}
  save(recipient: CareRecipient): Promise<void> {
    this.recipient = recipient;
    return Promise.resolve();
  }
  findById(id: string): Promise<CareRecipient | null> {
    return Promise.resolve(this.recipient !== null && id === R ? this.recipient : null);
  }
  findByIds(): Promise<CareRecipient[]> {
    return Promise.resolve([]);
  }
  listByOwner(): Promise<CareRecipient[]> {
    return Promise.resolve([]);
  }
  get current(): CareRecipient | null {
    return this.recipient;
  }
}

class AssignmentStore implements CareTeamAssignmentRepository {
  public items: CareTeamAssignment[] = [];
  add(assignment: CareTeamAssignment): Promise<void> {
    this.items.push(assignment);
    return Promise.resolve();
  }
  save(assignment: CareTeamAssignment): Promise<void> {
    const index = this.items.findIndex((a) => a.id === assignment.id);
    if (index !== -1) {
      this.items[index] = assignment;
    }
    return Promise.resolve();
  }
  findById(id: string): Promise<CareTeamAssignment | null> {
    return Promise.resolve(this.items.find((a) => a.id === id) ?? null);
  }
  listActiveForRecipient(): Promise<CareTeamAssignment[]> {
    return Promise.resolve(this.items.filter((a) => a.isActive));
  }
}

class EventStore implements CareTeamAssignmentEventRepository {
  public entries: CareTeamAssignmentEvent[] = [];
  add(event: CareTeamAssignmentEvent): Promise<void> {
    this.entries.push(event);
    return Promise.resolve();
  }
  listForRecipient(): Promise<CareTeamAssignmentEvent[]> {
    return Promise.resolve([...this.entries]);
  }
}

class CoverageStore implements CoverageBlockRepository {
  public blocks: CoverageBlock[] = [];
  replaceForRecipient(_id: string, blocks: CoverageBlock[]): Promise<void> {
    this.blocks = blocks;
    return Promise.resolve();
  }
  listForRecipient(): Promise<CoverageBlock[]> {
    return Promise.resolve(this.blocks);
  }
}

describe('care team admin writes', () => {
  it('assigns a caregiver, records history, and syncs the primary pointer', async () => {
    const recipients = new RecipientStore(makeRecipient());
    const store = new AssignmentStore();
    const events = new EventStore();
    const useCase = new AssignCaregiverUseCase(recipients, store, events, clock, ids());

    const { id } = await useCase.execute({
      recipientId: R,
      adminId: 'admin-1',
      caregiverId: 'cg1',
      role: CareTeamRole.Primary,
      specialization: "Alzheimer's Care",
      scheduleLabel: 'Mon-Fri, 8AM-5PM',
      reason: 'Primary caregiver assignment for full-time care plan',
    });

    expect(store.items).toHaveLength(1);
    expect(store.items[0].id).toBe(id);
    expect(store.items[0].caregiverId).toBe('cg1');
    expect(events.entries[0].reason).toBe('Primary caregiver assignment for full-time care plan');
    expect(events.entries[0].byAdminId).toBe('admin-1');
    // Assigning a primary syncs the recipient's primary caregiver pointer.
    expect(recipients.current?.primaryCaregiverId).toBe('cg1');
  });

  it('revises an assignment role and details', async () => {
    const recipients = new RecipientStore(makeRecipient());
    const store = new AssignmentStore();
    store.items.push(
      CareTeamAssignment.assign({
        id: 'a1',
        careRecipientId: R,
        caregiverId: 'cg2',
        role: CareTeamRole.Backup,
        now: NOW,
      }),
    );
    const useCase = new ReviseCaregiverAssignmentUseCase(recipients, store, clock);

    await useCase.execute({
      recipientId: R,
      assignmentId: 'a1',
      role: CareTeamRole.Primary,
      specialization: 'Personal Hygiene',
    });

    const revised = await store.findById('a1');
    expect(revised?.role).toBe(CareTeamRole.Primary);
    expect(revised?.specialization).toBe('Personal Hygiene');
    // Promoting to primary syncs the recipient pointer.
    expect(recipients.current?.primaryCaregiverId).toBe('cg2');
  });

  it('removes a caregiver, records history and clears a matching primary', async () => {
    const recipient = makeRecipient();
    recipient.assignPrimaryCaregiver('cg1', NOW);
    const recipients = new RecipientStore(recipient);
    const store = new AssignmentStore();
    store.items.push(
      CareTeamAssignment.assign({
        id: 'a1',
        careRecipientId: R,
        caregiverId: 'cg1',
        role: CareTeamRole.Primary,
        now: NOW,
      }),
    );
    const events = new EventStore();
    const useCase = new RemoveCaregiverUseCase(recipients, store, events, clock, ids());

    await useCase.execute({
      recipientId: R,
      assignmentId: 'a1',
      adminId: 'admin-1',
      reason: 'Relocated out of coverage sector',
    });

    expect((await store.findById('a1'))?.isActive).toBe(false);
    expect(events.entries[0].reason).toBe('Relocated out of coverage sector');
    expect(recipients.current?.primaryCaregiverId).toBeNull();
  });

  it('rejects removing an assignment that belongs to another recipient', async () => {
    const recipients = new RecipientStore(makeRecipient());
    const store = new AssignmentStore();
    store.items.push(
      CareTeamAssignment.assign({
        id: 'a1',
        careRecipientId: 'other',
        caregiverId: 'cg1',
        role: CareTeamRole.Backup,
        now: NOW,
      }),
    );
    const useCase = new RemoveCaregiverUseCase(recipients, store, new EventStore(), clock, ids());
    await expect(
      useCase.execute({ recipientId: R, assignmentId: 'a1', adminId: 'admin-1', reason: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('replaces the weekly coverage grid', async () => {
    const recipients = new RecipientStore(makeRecipient());
    const store = new CoverageStore();
    const useCase = new SetCoverageUseCase(recipients, store, ids());

    const result = await useCase.execute({
      recipientId: R,
      blocks: [
        { weekday: Weekday.Monday, slot: CoverageSlot.Morning, caregiverId: 'cg1' },
        { weekday: Weekday.Sunday, slot: CoverageSlot.Afternoon, caregiverId: null },
      ],
    });

    expect(result.blockCount).toBe(2);
    expect(store.blocks[0].weekday).toBe(Weekday.Monday);
    expect(store.blocks[0].caregiverId).toBe('cg1');
    expect(store.blocks[1].isAssigned).toBe(false);
  });

  it('rejects setting coverage for an unknown recipient', async () => {
    const useCase = new SetCoverageUseCase(new RecipientStore(null), new CoverageStore(), ids());
    await expect(useCase.execute({ recipientId: 'nope', blocks: [] })).rejects.toBeInstanceOf(
      NotFoundDomainException,
    );
  });
});
