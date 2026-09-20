import { AdminUser } from '@modules/admin-identity/domain/admin-user.entity';
import { AdminUserRepository } from '@modules/admin-identity/domain/admin-user.repository';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { CareRecipientRepository } from '@modules/care-recipients/domain/care-recipient.repository';
import { CareTeamAction } from '@modules/care-recipients/domain/care-team-action.enum';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import { CareTeamAssignmentRepository } from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamAssignmentEvent } from '@modules/care-recipients/domain/care-team-assignment-event.entity';
import { CareTeamAssignmentEventRepository } from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import { CoverageBlock } from '@modules/care-recipients/domain/coverage-block.entity';
import { CoverageBlockRepository } from '@modules/care-recipients/domain/coverage-block.repository';
import { CoverageSlot } from '@modules/care-recipients/domain/coverage-slot.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import { Certification } from '@modules/certifications/domain/certification.entity';
import { CertificationRepository } from '@modules/certifications/domain/certification.repository';
import { User } from '@modules/identity/domain/user.entity';
import { UserRepository } from '@modules/identity/domain/user.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitRepository } from '@modules/visits/domain/visit.repository';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { GetRecipientCaregiversUseCase } from './get-recipient-caregivers.use-case';

const NOW = new Date('2026-07-24T00:00:00.000Z');
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

function assign(
  id: string,
  caregiverId: string,
  role: CareTeamRole,
  spec?: string,
): CareTeamAssignment {
  return CareTeamAssignment.assign({
    id,
    careRecipientId: R,
    caregiverId,
    role,
    specialization: spec ?? null,
    scheduleLabel: 'Mon-Fri, 8AM-5PM',
    now: NOW,
  });
}

const assignments: CareTeamAssignmentRepository = {
  add: () => Promise.resolve(),
  save: () => Promise.resolve(),
  findById: () => Promise.resolve(null),
  listActiveForRecipient: () =>
    Promise.resolve([
      assign('a1', 'cg1', CareTeamRole.Primary, "Alzheimer's Care"),
      assign('a2', 'cg2', CareTeamRole.Backup),
      assign('a3', 'cg3', CareTeamRole.Coordinator),
    ]),
};

const events: CareTeamAssignmentEventRepository = {
  add: () => Promise.resolve(),
  listForRecipient: () =>
    Promise.resolve([
      CareTeamAssignmentEvent.record({
        id: 'h1',
        careRecipientId: R,
        caregiverId: 'cg1',
        action: CareTeamAction.Assigned,
        reason: 'Primary caregiver assignment',
        byAdminId: 'admin1',
        now: new Date('2026-07-12T00:00:00.000Z'),
      }),
      CareTeamAssignmentEvent.record({
        id: 'h2',
        careRecipientId: R,
        caregiverId: 'cg9',
        action: CareTeamAction.Removed,
        reason: 'Relocated out of coverage sector',
        byAdminId: null,
        now: new Date('2026-06-15T00:00:00.000Z'),
      }),
    ]),
};

function coverage(blocks: CoverageBlock[]): CoverageBlockRepository {
  return {
    replaceForRecipient: () => Promise.resolve(),
    listForRecipient: () => Promise.resolve(blocks),
  };
}

function users(): UserRepository {
  const map: Record<string, string> = {
    cg1: 'Sarah Williams',
    cg2: 'David Park',
    cg3: 'Mike Chen',
  };
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    findByIds: (ids) =>
      Promise.resolve(
        ids
          .filter((id) => id in map)
          .map((id) => ({ id, name: { fullName: map[id] }, photoKey: null }) as unknown as User),
      ),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
    existsByPhone: () => Promise.resolve(false),
    countByType: () => Promise.resolve(0),
  };
}

function admins(): AdminUserRepository {
  return {
    save: () => Promise.resolve(),
    findById: (id: string) =>
      Promise.resolve(
        id === 'admin1' ? ({ name: { fullName: 'Admin User' } } as unknown as AdminUser) : null,
      ),
    findByEmail: () => Promise.resolve(null),
    existsByEmail: () => Promise.resolve(false),
  } as unknown as AdminUserRepository;
}

function certifications(): CertificationRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
    listExpiringBefore: () => Promise.resolve([]),
    listForCaregiver: (caregiverId) =>
      Promise.resolve(
        caregiverId === 'cg1'
          ? ['CNA', "Alzheimer's Certified", 'CPR'].map((name, index) =>
              Certification.rehydrate(`c${index}`, {
                caregiverId,
                name,
                licenseNumber: null,
                issuedAt: new Date('2025-01-01T00:00:00.000Z'),
                expiresAt: new Date('2027-01-01T00:00:00.000Z'),
                createdAt: new Date('2025-01-01T00:00:00.000Z'),
              }),
            )
          : [],
      ),
  };
}

function visit(caregiverId: string, activeSeconds: number): Visit {
  return { caregiverId, activeSeconds } as unknown as Visit;
}

function visits(): VisitRepository {
  return {
    save: () => Promise.resolve(),
    findById: () => Promise.resolve(null),
    listForCaregiverInRange: () => Promise.resolve([]),
    listForDateRange: () => Promise.resolve([]),
    listForCareRecipientsInRange: (_ids, from) =>
      // This month starts 2026-07-01; the prior month starts 2026-06-01.
      Promise.resolve(
        from.getTime() === new Date('2026-07-01T00:00:00.000Z').getTime()
          ? [visit('cg1', 162000), visit('cg3', 18000), visit('cg2', 43200)]
          : [visit('cg1', 208800)],
      ),
  };
}

function build(blocks: CoverageBlock[]): GetRecipientCaregiversUseCase {
  return new GetRecipientCaregiversUseCase(
    recipients(true),
    assignments,
    events,
    coverage(blocks),
    users(),
    admins(),
    certifications(),
    visits(),
    clock,
  );
}

function block(weekday: Weekday, slot: CoverageSlot, caregiverId: string | null): CoverageBlock {
  return CoverageBlock.create({
    id: `${weekday}-${slot}`,
    careRecipientId: R,
    weekday,
    slot,
    caregiverId,
  });
}

describe('GetRecipientCaregiversUseCase', () => {
  it('rejects an unknown recipient', async () => {
    const useCase = new GetRecipientCaregiversUseCase(
      recipients(false),
      assignments,
      events,
      coverage([]),
      users(),
      admins(),
      certifications(),
      visits(),
      clock,
    );
    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('builds the summary cards: count, care hours with trend, coverage rate', async () => {
    const result = await build([
      block(Weekday.Monday, CoverageSlot.Morning, 'cg1'),
      block(Weekday.Monday, CoverageSlot.Afternoon, 'cg1'),
      block(Weekday.Saturday, CoverageSlot.Morning, 'cg2'),
      block(Weekday.Sunday, CoverageSlot.Morning, null),
    ]).execute(R);
    expect(result.summary.assignedCaregivers).toBe(3);
    expect(result.summary.totalCareHoursThisMonth).toBe(62);
    expect(result.summary.careHoursTrend).toBe(4);
    // Three of four blocks are assigned.
    expect(result.summary.coverageRatePercent).toBe(75);
  });

  it('builds the team roster with role, derived status, hours and certifications', async () => {
    const result = await build([]).execute(R);
    const sarah = result.team.find((m) => m.caregiverId === 'cg1');
    const david = result.team.find((m) => m.caregiverId === 'cg2');
    expect(sarah?.name).toBe('Sarah Williams');
    expect(sarah?.role).toBe('PRIMARY');
    expect(sarah?.status).toBe('Active');
    expect(sarah?.specialization).toBe("Alzheimer's Care");
    expect(sarah?.hoursThisMonth).toBe(45);
    expect(sarah?.certifications).toEqual(['CNA', "Alzheimer's Certified", 'CPR']);
    expect(sarah?.rating).toBeNull();
    // Backup caregivers surface as Available.
    expect(david?.status).toBe('Available');
  });

  it('resolves coverage and history names', async () => {
    const result = await build([block(Weekday.Monday, CoverageSlot.Morning, 'cg1')]).execute(R);
    expect(result.coverage[0].caregiverName).toBe('Sarah Williams');
    expect(result.history[0].action).toBe('ASSIGNED');
    expect(result.history[0].caregiverName).toBe('Sarah Williams');
    expect(result.history[0].byName).toBe('Admin User');
    // Removed caregiver no longer in the directory resolves to null.
    expect(result.history[1].caregiverName).toBeNull();
  });
});
