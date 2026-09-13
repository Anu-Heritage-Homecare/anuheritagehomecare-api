import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_USER_REPOSITORY,
  AdminUserRepository,
} from '@modules/admin-identity/domain/admin-user.repository';
import { CareTeamAssignment } from '@modules/care-recipients/domain/care-team-assignment.entity';
import {
  CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY,
  CareTeamAssignmentEventRepository,
} from '@modules/care-recipients/domain/care-team-assignment-event.repository';
import {
  CARE_TEAM_ASSIGNMENT_REPOSITORY,
  CareTeamAssignmentRepository,
} from '@modules/care-recipients/domain/care-team-assignment.repository';
import { CareTeamRole } from '@modules/care-recipients/domain/care-team-role.enum';
import {
  COVERAGE_BLOCK_REPOSITORY,
  CoverageBlockRepository,
} from '@modules/care-recipients/domain/coverage-block.repository';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import {
  CERTIFICATION_REPOSITORY,
  CertificationRepository,
} from '@modules/certifications/domain/certification.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CareTeamMemberResult,
  RecipientCaregiversResult,
} from '../dto/recipient-caregivers.result';

const HISTORY_LIMIT = 50;
const SECONDS_PER_HOUR = 3600;

/**
 * Use case: assemble one recipient's Caregivers tab. Composes the office set care
 * team (with roles, specialization and schedule), each caregiver's name and photo
 * (identity), certifications (certifications context) and hours worked this month
 * for this recipient (visits), the recurring weekly coverage grid, the summary
 * cards and the assignment history with admin attribution. Per caregiver ratings
 * are not captured yet and are returned null.
 */
@Injectable()
export class GetRecipientCaregiversUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CareTeamAssignmentRepository,
    @Inject(CARE_TEAM_ASSIGNMENT_EVENT_REPOSITORY)
    private readonly history: CareTeamAssignmentEventRepository,
    @Inject(COVERAGE_BLOCK_REPOSITORY) private readonly coverage: CoverageBlockRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ADMIN_USER_REPOSITORY) private readonly admins: AdminUserRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certifications: CertificationRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string): Promise<RecipientCaregiversResult> {
    if ((await this.recipients.findById(recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const [team, history, coverage, thisMonthVisits, lastMonthVisits] = await Promise.all([
      this.assignments.listActiveForRecipient(recipientId),
      this.history.listForRecipient(recipientId, HISTORY_LIMIT),
      this.coverage.listForRecipient(recipientId),
      this.visits.listForCareRecipientsInRange([recipientId], monthStart, now),
      this.visits.listForCareRecipientsInRange([recipientId], lastMonthStart, monthStart),
    ]);

    const caregiverIds = [
      ...new Set(
        [
          ...team.map((a) => a.caregiverId),
          ...coverage.map((b) => b.caregiverId),
          ...history.map((h) => h.caregiverId),
        ].filter((id): id is string => id !== null),
      ),
    ];
    const [usersById, certsByCaregiver] = await Promise.all([
      this.users.findByIds(caregiverIds).then((list) => new Map(list.map((u) => [u.id, u]))),
      this.certificationsByCaregiver(team),
    ]);
    const caregiverName = (id: string | null): string | null =>
      id === null ? null : (usersById.get(id)?.name.fullName ?? null);

    const adminName = await this.resolveAdmins(history.map((h) => h.byAdminId));
    const hoursThisMonth = hoursByCaregiver(thisMonthVisits);
    const totalHoursThisMonth = toHours(sum(thisMonthVisits));
    const totalHoursLastMonth = toHours(sum(lastMonthVisits));
    const assignedBlocks = coverage.filter((b) => b.isAssigned).length;

    return {
      summary: {
        assignedCaregivers: team.length,
        totalCareHoursThisMonth: totalHoursThisMonth,
        careHoursTrend: totalHoursThisMonth - totalHoursLastMonth,
        coverageRatePercent:
          coverage.length === 0 ? 0 : Math.round((assignedBlocks / coverage.length) * 100),
      },
      team: team.map((assignment) =>
        this.toMember(
          assignment,
          usersById.get(assignment.caregiverId) ?? null,
          certsByCaregiver,
          hoursThisMonth,
        ),
      ),
      coverage: coverage.map((b) => ({
        weekday: String(b.weekday),
        slot: String(b.slot),
        caregiverId: b.caregiverId,
        caregiverName: caregiverName(b.caregiverId),
      })),
      history: history.map((h) => ({
        at: h.createdAt,
        action: String(h.action),
        caregiverId: h.caregiverId,
        caregiverName: caregiverName(h.caregiverId),
        reason: h.reason,
        byName: h.byAdminId === null ? null : (adminName.get(h.byAdminId) ?? null),
      })),
    };
  }

  private toMember(
    assignment: CareTeamAssignment,
    user: { id: string; name: { fullName: string }; photoKey: string | null } | null,
    certsByCaregiver: Map<string, string[]>,
    hoursThisMonth: Map<string, number>,
  ): CareTeamMemberResult {
    const seconds = hoursThisMonth.get(assignment.caregiverId) ?? 0;
    return {
      assignmentId: assignment.id,
      caregiverId: assignment.caregiverId,
      name: user?.name.fullName ?? null,
      photoKey: user?.photoKey ?? null,
      role: String(assignment.role),
      status: assignment.role === CareTeamRole.Backup ? 'Available' : 'Active',
      specialization: assignment.specialization,
      scheduleLabel: assignment.scheduleLabel,
      hoursThisMonth: toHours(seconds),
      // Per caregiver ratings are not captured yet.
      rating: null,
      certifications: certsByCaregiver.get(assignment.caregiverId) ?? [],
    };
  }

  private async certificationsByCaregiver(
    team: CareTeamAssignment[],
  ): Promise<Map<string, string[]>> {
    const ids = [...new Set(team.map((a) => a.caregiverId))];
    const lists = await Promise.all(
      ids.map((id) =>
        this.certifications.listForCaregiver(id).then((certs) => [id, certs] as const),
      ),
    );
    return new Map(lists.map(([id, certs]) => [id, certs.map((c) => c.name)]));
  }

  private async resolveAdmins(ids: (string | null)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    const result = new Map<string, string>();
    for (const id of unique) {
      const admin = await this.admins.findById(id);
      if (admin !== null) {
        result.set(id, admin.name.fullName);
      }
    }
    return result;
  }
}

/** Total active seconds per caregiver across the given visits. */
function hoursByCaregiver(visits: Visit[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const visit of visits) {
    if (visit.caregiverId === null || visit.activeSeconds === null) {
      continue;
    }
    map.set(visit.caregiverId, (map.get(visit.caregiverId) ?? 0) + visit.activeSeconds);
  }
  return map;
}

/** Total active seconds across the given visits. */
function sum(visits: Visit[]): number {
  return visits.reduce((total, visit) => total + (visit.activeSeconds ?? 0), 0);
}

/** Whole hours from a count of seconds. */
function toHours(seconds: number): number {
  return Math.round(seconds / SECONDS_PER_HOUR);
}
