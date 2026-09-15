import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentRepository } from '@modules/care-recipients/domain/care-team-assignment.repository';
import { DischargeRecord } from '@modules/care-recipients/domain/discharge-record.entity';
import { DischargeRecordRepository } from '@modules/care-recipients/domain/discharge-record.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  BillingSummaryView,
  RecipientBillingReadModel,
} from '../ports/recipient-billing-read.port';
import { GetRecipientArchiveUseCase } from './get-recipient-archive.use-case';

const NOW = new Date('2026-08-20T12:00:00.000Z');
const clock: Clock = { now: () => NOW };
const R = 'r1';

function recipient(): CareRecipient {
  return {
    id: R,
    ownerId: 'owner1',
    status: 'ACTIVE',
    completedAt: new Date('2025-01-15T00:00:00.000Z'),
    schedule: { frequency: CareFrequency.Daily },
    primaryCaregiverId: 'cg1',
  } as unknown as CareRecipient;
}

function recipients(exists: boolean): CareRecipientRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id) => Promise.resolve(exists && id === R ? recipient() : null),
    findByIds: () => Promise.resolve([]),
    listByOwner: () => Promise.resolve([]),
  };
}

function visitStub(status: VisitStatus, dayOffset: number): Visit {
  return {
    status,
    scheduledDate: new Date(NOW.getTime() + dayOffset * 86_400_000),
  } as unknown as Visit;
}

function visits(): VisitRepository {
  const items = [
    visitStub(VisitStatus.Completed, -30),
    visitStub(VisitStatus.Completed, -20),
    visitStub(VisitStatus.Completed, -10),
    visitStub(VisitStatus.Scheduled, 5),
  ];
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listForCaregiverInRange: () => Promise.resolve([]),
    listForCareRecipientsInRange: () => Promise.resolve(items),
    listForDateRange: () => Promise.resolve([]),
  };
}

function team(count: number): CareTeamAssignmentRepository {
  const items = Array.from({ length: count }, () => ({}) as unknown as CareTeamAssignment);
  return {
    add: () => Promise.resolve(),
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listActiveForRecipient: () => Promise.resolve(items),
  };
}

function billing(outstandingMinor: number): RecipientBillingReadModel {
  const summary: BillingSummaryView = {
    currency: null,
    billedThisMonthMinor: 0,
    billedLastMonthMinor: 0,
    outstandingMinor,
    earliestDueDate: null,
    lastPaymentMinor: null,
    lastPaymentAt: null,
    overdueCount: 0,
  };
  return {
    listInvoices: () => Promise.resolve({ rows: [], total: 0 }),
    summary: () => Promise.resolve(summary),
    serviceBreakdown: () => Promise.resolve([]),
    paymentHistory: () => Promise.resolve([]),
  };
}

function records(record: DischargeRecord | null): DischargeRecordRepository {
  return {
    add: () => Promise.resolve(),
    save: () => Promise.resolve(),
    findByRecipient: () => Promise.resolve(record),
  };
}

function users(): UserRepository {
  const owner = { address: { country: 'NG' } } as unknown as User;
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(owner),
    findByIds: () => Promise.resolve([]),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function build(outstandingMinor = 0, activeTeam = 3): GetRecipientArchiveUseCase {
  return new GetRecipientArchiveUseCase(
    recipients(true),
    visits(),
    team(activeTeam),
    billing(outstandingMinor),
    records(null),
    users(),
    clock,
  );
}

describe('GetRecipientArchiveUseCase', () => {
  it('assembles the service summary', async () => {
    const result = await build().execute(R);

    expect(result.summary.status).toBe('ACTIVE');
    expect(result.summary.careDurationLabel).toBe('1 yr, 7 month');
    expect(result.summary.totalVisitsCompleted).toBe(3);
    expect(result.summary.activePlan).toBe(true);
    expect(result.summary.planLevel).toBe('Full-Time');
    expect(result.summary.assignedCaregivers).toBe(3);
    // The owner's country (NG) supplies the currency when there are no invoices.
    expect(result.summary.outstandingBalance).toEqual({ amountMinor: 0, currency: 'NGN' });
  });

  it('derives the checklist from the recipient state', async () => {
    const result = await build().execute(R);
    const byKey = new Map(result.checklist.map((item) => [item.key, item.status]));

    // A future scheduled visit and active caregivers keep those items pending.
    expect(byKey.get('SHIFTS_RECONCILED')).toBe('PENDING');
    expect(byKey.get('REMOVE_STAFF_ASSIGNMENTS')).toBe('PENDING');
    expect(byKey.get('BILLING_RECONCILED')).toBe('DONE');
    expect(byKey.get('CARE_PLAN_CLOSED')).toBe('PENDING');
    expect(byKey.get('FAMILY_ACKNOWLEDGMENT')).toBe('NOT_STARTED');
    expect(byKey.get('GENERATE_DISCHARGE_LETTER')).toBe('NOT_STARTED');
  });

  it('marks billing reconciled only when nothing is outstanding', async () => {
    const result = await build(25_000).execute(R);
    const billingItem = result.checklist.find((item) => item.key === 'BILLING_RECONCILED');
    expect(billingItem?.status).toBe('PENDING');
    expect(result.summary.outstandingBalance).toEqual({ amountMinor: 25_000, currency: 'NGN' });
  });

  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientArchiveUseCase(
      recipients(false),
      visits(),
      team(0),
      billing(0),
      records(null),
      users(),
      clock,
    );
    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
