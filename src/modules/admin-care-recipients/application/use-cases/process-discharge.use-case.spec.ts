import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import { CareTeamAssignmentEventRepository } from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import { CareTeamAssignmentRepository } from '@modules/care-recipients/domain/care-team-assignment.repository';
import { DischargeAcknowledgement } from '@modules/care-recipients/domain/discharge-acknowledgement.enum';
import { DischargeAction } from '@modules/care-recipients/domain/discharge-action.enum';
import { DischargeReason } from '@modules/care-recipients/domain/discharge-reason.enum';
import { DischargeRecord } from '@modules/care-recipients/domain/discharge-record.entity';
import { DischargeRecordRepository } from '@modules/care-recipients/domain/discharge-record.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { ProcessDischargeUseCase } from './process-discharge.use-case';

const NOW = new Date('2026-07-24T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';
const EFFECTIVE = new Date('2026-07-30T00:00:00.000Z');
const ALL_ACKS: DischargeAcknowledgement[] = [
  DischargeAcknowledgement.FinalAssessmentFiled,
  DischargeAcknowledgement.ClinicalTasksResolved,
  DischargeAcknowledgement.FamilyNotified,
  DischargeAcknowledgement.FinalInvoicesVerified,
  DischargeAcknowledgement.RecordsArchived,
];

function ids(): IdGenerator {
  let n = 0;
  return { generate: () => `id-${(n += 1)}` };
}

interface RecipientStub {
  id: string;
  status: string;
  primaryCaregiverId: string | null;
}

function recipientStub(): CareRecipient & RecipientStub {
  const stub: RecipientStub & {
    placeOnHold: () => void;
    discharge: () => void;
    unassignPrimaryCaregiver: () => void;
  } = {
    id: R,
    status: 'ACTIVE',
    primaryCaregiverId: 'cg1',
    placeOnHold() {
      this.status = 'ON_HOLD';
    },
    discharge() {
      this.status = 'DISCHARGED';
    },
    unassignPrimaryCaregiver() {
      this.primaryCaregiverId = null;
    },
  };
  return stub as unknown as CareRecipient & RecipientStub;
}

function recipients(recipient: (CareRecipient & RecipientStub) | null): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(recipient !== null && id === R ? recipient : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function visitStub(id: string, status: VisitStatus, dayOffset: number): Visit {
  const scheduledDate = new Date(NOW.getTime() + dayOffset * 86_400_000);
  const stub = {
    id,
    status,
    scheduledDate,
    cancel() {
      this.status = VisitStatus.Cancelled;
    },
  };
  return stub as unknown as Visit;
}

class VisitStore implements VisitRepository {
  public saved: Visit[] = [];
  constructor(private readonly items: Visit[]) {}
  save(visit: Visit): Promise<void> {
    this.saved.push(visit);
    return Promise.resolve();
  }
  findById(): Promise<Visit | null> {
    return Promise.resolve(null);
  }
  listForCaregiverInRange(): Promise<Visit[]> {
    return Promise.resolve([]);
  }
  listForCareRecipientsInRange(): Promise<Visit[]> {
    return Promise.resolve(this.items);
  }
  listForDateRange(): Promise<Visit[]> {
    return Promise.resolve([]);
  }
}

function assignmentStub(id: string, caregiverId: string): CareTeamAssignment {
  const stub = {
    id,
    caregiverId,
    removed: false,
    remove() {
      this.removed = true;
    },
  };
  return stub as unknown as CareTeamAssignment;
}

class TeamStore implements CareTeamAssignmentRepository {
  public saved: CareTeamAssignment[] = [];
  constructor(private readonly active: CareTeamAssignment[]) {}
  add(): Promise<void> {
    return Promise.resolve();
  }
  save(assignment: CareTeamAssignment): Promise<void> {
    this.saved.push(assignment);
    return Promise.resolve();
  }
  findById(): Promise<CareTeamAssignment | null> {
    return Promise.resolve(null);
  }
  listActiveForRecipient(): Promise<CareTeamAssignment[]> {
    return Promise.resolve(this.active);
  }
}

class HistoryStore implements CareTeamAssignmentEventRepository {
  public items: CareTeamAssignmentEvent[] = [];
  add(event: CareTeamAssignmentEvent): Promise<void> {
    this.items.push(event);
    return Promise.resolve();
  }
  listForRecipient(): Promise<CareTeamAssignmentEvent[]> {
    return Promise.resolve([...this.items]);
  }
}

class RecordStore implements DischargeRecordRepository {
  public items: DischargeRecord[] = [];
  add(record: DischargeRecord): Promise<void> {
    this.items.push(record);
    return Promise.resolve();
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  findByRecipient(): Promise<DischargeRecord | null> {
    return Promise.resolve(this.items[0] ?? null);
  }
}

function dischargeCommand(): Parameters<ProcessDischargeUseCase['execute']>[0] {
  return {
    recipientId: R,
    adminId: 'admin1',
    action: DischargeAction.Discharge,
    reason: DischargeReason.CareNoLongerNeeded,
    effectiveDate: EFFECTIVE,
    clinicalSummary: 'Transitioned successfully to full-time family care.',
    acknowledgements: ALL_ACKS,
  };
}

describe('ProcessDischargeUseCase', () => {
  it('discharges: transitions, cancels future visits and detaches the care team', async () => {
    const recipient = recipientStub();
    const visits = new VisitStore([
      visitStub('v1', VisitStatus.Scheduled, 5),
      visitStub('v2', VisitStatus.Completed, -3),
      visitStub('v3', VisitStatus.Scheduled, 12),
    ]);
    const team = new TeamStore([assignmentStub('a1', 'cg1'), assignmentStub('a2', 'cg2')]);
    const history = new HistoryStore();
    const useCase = new ProcessDischargeUseCase(
      recipients(recipient),
      new RecordStore(),
      visits,
      team,
      history,
      clock,
      ids(),
    );

    const result = await useCase.execute(dischargeCommand());

    expect(result.status).toBe('DISCHARGED');
    expect(result.cancelledVisits).toBe(2);
    expect(result.removedAssignments).toBe(2);
    expect(visits.saved.map((v) => v.status)).toEqual([
      VisitStatus.Cancelled,
      VisitStatus.Cancelled,
    ]);
    expect(history.items).toHaveLength(2);
    expect(recipient.primaryCaregiverId).toBeNull();
  });

  it('holds: transitions without cancelling visits or detaching caregivers', async () => {
    const recipient = recipientStub();
    const visits = new VisitStore([visitStub('v1', VisitStatus.Scheduled, 5)]);
    const team = new TeamStore([assignmentStub('a1', 'cg1')]);
    const useCase = new ProcessDischargeUseCase(
      recipients(recipient),
      new RecordStore(),
      visits,
      team,
      new HistoryStore(),
      clock,
      ids(),
    );

    const result = await useCase.execute({
      recipientId: R,
      adminId: 'admin1',
      action: DischargeAction.Hold,
      reason: DischargeReason.Hospitalization,
      effectiveDate: EFFECTIVE,
    });

    expect(result.status).toBe('ON_HOLD');
    expect(result.cancelledVisits).toBe(0);
    expect(result.removedAssignments).toBe(0);
    expect(visits.saved).toHaveLength(0);
    expect(recipient.primaryCaregiverId).toBe('cg1');
  });

  it('rejects a discharge missing acknowledgements', async () => {
    const useCase = new ProcessDischargeUseCase(
      recipients(recipientStub()),
      new RecordStore(),
      new VisitStore([]),
      new TeamStore([]),
      new HistoryStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({ ...dischargeCommand(), acknowledgements: ALL_ACKS.slice(0, 2) }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new ProcessDischargeUseCase(
      recipients(null),
      new RecordStore(),
      new VisitStore([]),
      new TeamStore([]),
      new HistoryStore(),
      clock,
      ids(),
    );
    await expect(
      useCase.execute({ ...dischargeCommand(), recipientId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
