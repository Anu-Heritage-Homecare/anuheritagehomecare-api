import { Inject, Injectable } from '@nestjs/common';
import {
  OPERATIONAL_ALERT_REPOSITORY,
  OperationalAlertRepository,
} from '@modules/admin-alerts/domain/operational-alert.repository';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { User } from '@modules/identity/domain/user.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  CARE_RECIPIENT_READ_MODEL,
  CareRecipientReadModel,
} from '../ports/care-recipient-read.port';
import {
  CareNoteResult,
  CareRecipientProfileResult,
  CareSummaryResult,
  CareTeamMemberResult,
  ContactResult,
  PersonalInformationResult,
  ProfileHeaderResult,
  QuickStatsResult,
  RecentVisitResult,
  UpcomingVisitResult,
} from '../dto/care-recipient-profile.result';

const CARE_LEVEL: Record<CareFrequency, string> = {
  [CareFrequency.LiveInCare]: '24-Hour',
  [CareFrequency.Daily]: 'Full-Time',
  [CareFrequency.Weekly]: 'Part-Time',
  [CareFrequency.OneTimeVisit]: 'Hourly',
};

const MS_PER_DAY = 86_400_000;
const HISTORY_DAYS = 90;
const RECENT_LIMIT = 4;
const UPCOMING_LIMIT = 3;
const NOTES_LIMIT = 3;
const LATE_GRACE_MINUTES = 10;

/**
 * Use case: assemble the admin care recipient profile (the Overview tab). Composes
 * the recipient aggregate with the family owner and caregivers (identity), the
 * recipient's visits and care notes (visits) and the open alerts. Office set data
 * that has no capture surface yet (recipient contact details, languages, the
 * coordinator and backup roles, per recipient satisfaction) is returned as null or
 * empty, consistent with the rest of the app.
 */
@Injectable()
export class GetCareRecipientProfileUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CARE_RECIPIENT_READ_MODEL) private readonly readModel: CareRecipientReadModel,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(OPERATIONAL_ALERT_REPOSITORY) private readonly alerts: OperationalAlertRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string): Promise<CareRecipientProfileResult> {
    const recipient = await this.recipients.findById(recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const today = startOfUtcDay(now);
    const from = new Date(today.getTime() - HISTORY_DAYS * MS_PER_DAY);
    const to = new Date(today.getTime() + HISTORY_DAYS * MS_PER_DAY);

    const [recipientNumber, visits, openAlerts] = await Promise.all([
      this.readModel.recipientNumberById(recipientId),
      this.visits.listForCareRecipientsInRange([recipientId], from, to),
      this.alerts.listOpen(200),
    ]);

    const noteAuthorIds = visits.flatMap((v) => v.notes.map((n) => n.authorId));
    const visitCaregiverIds = visits
      .map((v) => v.caregiverId)
      .filter((id): id is string => id !== null);
    const userIds = [
      ...new Set(
        [
          recipient.ownerId,
          recipient.primaryCaregiverId,
          ...visitCaregiverIds,
          ...noteAuthorIds,
        ].filter((id): id is string => id !== null),
      ),
    ];
    const usersById = new Map((await this.users.findByIds(userIds)).map((u) => [u.id, u]));

    const owner = usersById.get(recipient.ownerId) ?? null;
    const activeCareAlerts = openAlerts.filter(
      (a) => a.relatedCareRecipientId === recipientId,
    ).length;

    return {
      header: this.buildHeader(recipient, recipientNumber, now),
      personalInformation: this.buildPersonalInformation(recipient, owner, now),
      careSummary: this.buildCareSummary(recipient, usersById, visits, today),
      quickStats: this.buildQuickStats(visits, now, activeCareAlerts),
      medications: recipient.medications.map((m) => ({
        name: m.name,
        dose: m.dose,
        scheduleMinute: m.scheduleMinute,
      })),
      careTeam: this.buildCareTeam(recipient, usersById),
      recentVisits: this.buildRecentVisits(visits, usersById, today),
      upcomingVisits: this.buildUpcomingVisits(visits, usersById, today),
      latestNotes: this.buildNotes(visits, usersById),
    };
  }

  private buildHeader(
    recipient: CareRecipient,
    recipientNumber: number | null,
    now: Date,
  ): ProfileHeaderResult {
    const conditions = recipient.health?.medicalConditions ?? [];
    return {
      id: recipient.id,
      code: recipientNumber === null ? '' : `CR-${String(recipientNumber).padStart(3, '0')}`,
      name: recipient.profile.name,
      photoKey: recipient.profile.photoKey,
      age: ageInYears(recipient.profile.dateOfBirth, now),
      gender: String(recipient.profile.gender),
      status: String(recipient.status),
      priority: String(recipient.priority),
      primaryDiagnosis: conditions[0] ?? null,
      careLevel: recipient.schedule === null ? null : CARE_LEVEL[recipient.schedule.frequency],
    };
  }

  private buildPersonalInformation(
    recipient: CareRecipient,
    owner: User | null,
    now: Date,
  ): PersonalInformationResult {
    return {
      // Recipient contact details and languages are not captured on the record yet.
      phone: null,
      email: null,
      address: recipient.profile.fullAddress,
      dateOfBirth: recipient.profile.dateOfBirth,
      age: ageInYears(recipient.profile.dateOfBirth, now),
      familyMember: owner === null ? null : this.ownerContact(owner),
      languages: [],
    };
  }

  private buildCareSummary(
    recipient: CareRecipient,
    usersById: Map<string, User>,
    visits: Visit[],
    today: Date,
  ): CareSummaryResult {
    const conditions = recipient.health?.medicalConditions ?? [];
    const primaryCaregiver =
      recipient.primaryCaregiverId === null
        ? null
        : (usersById.get(recipient.primaryCaregiverId) ?? null);
    const owner = usersById.get(recipient.ownerId) ?? null;
    const next = this.nextScheduledVisit(visits, today);
    return {
      careLevel: recipient.schedule === null ? null : CARE_LEVEL[recipient.schedule.frequency],
      startDate: recipient.schedule?.estimatedStartDate ?? recipient.completedAt,
      primaryDiagnosis: conditions[0] ?? null,
      secondaryDiagnoses: conditions.slice(1),
      primaryCaregiverName: primaryCaregiver === null ? null : primaryCaregiver.name.fullName,
      // Coordinator is an office set role, deferred until the care team admin surface exists.
      coordinatorName: null,
      nextScheduledVisitAt: next,
      emergencyContact: owner === null ? null : this.ownerContact(owner),
    };
  }

  private buildQuickStats(visits: Visit[], now: Date, activeCareAlerts: number): QuickStatsResult {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thisMonth = visits.filter((v) => v.scheduledDate.getTime() >= monthStart.getTime());
    const careSeconds = thisMonth.reduce((sum, v) => sum + (v.activeSeconds ?? 0), 0);
    const missedOrLate = thisMonth.filter((v) => this.isMissedOrLate(v)).length;
    return {
      totalVisitsThisMonth: thisMonth.length,
      careHoursThisMonth: Math.round(careSeconds / 3600),
      // Satisfaction ratings capture is not built yet.
      avgSatisfaction: null,
      missedOrLateThisMonth: missedOrLate,
      activeCareAlerts,
    };
  }

  private buildCareTeam(
    recipient: CareRecipient,
    usersById: Map<string, User>,
  ): CareTeamMemberResult[] {
    if (recipient.primaryCaregiverId === null) {
      return [];
    }
    const caregiver = usersById.get(recipient.primaryCaregiverId);
    if (caregiver === undefined) {
      return [];
    }
    return [
      {
        caregiverId: caregiver.id,
        name: caregiver.name.fullName,
        role: 'Primary Caregiver',
        active: true,
      },
    ];
  }

  private buildRecentVisits(
    visits: Visit[],
    usersById: Map<string, User>,
    today: Date,
  ): RecentVisitResult[] {
    return visits
      .filter((v) => v.scheduledDate.getTime() <= today.getTime())
      .sort((a, b) => this.chronologyKey(b) - this.chronologyKey(a))
      .slice(0, RECENT_LIMIT)
      .map((v) => ({
        id: v.id,
        date: v.scheduledDate,
        startMinute: v.window.startMinute,
        caregiverName: this.caregiverName(v, usersById),
        type: String(v.type),
        durationMinutes:
          v.activeSeconds !== null
            ? Math.round(v.activeSeconds / 60)
            : v.window.endMinute - v.window.startMinute,
        status: String(v.status),
      }));
  }

  private buildUpcomingVisits(
    visits: Visit[],
    usersById: Map<string, User>,
    today: Date,
  ): UpcomingVisitResult[] {
    return visits
      .filter(
        (v) => v.scheduledDate.getTime() >= today.getTime() && v.status === VisitStatus.Scheduled,
      )
      .sort((a, b) => this.chronologyKey(a) - this.chronologyKey(b))
      .slice(0, UPCOMING_LIMIT)
      .map((v) => ({
        id: v.id,
        date: v.scheduledDate,
        startMinute: v.window.startMinute,
        description: v.specialInstructions[0] ?? String(v.type),
        caregiverName: this.caregiverName(v, usersById),
      }));
  }

  private buildNotes(visits: Visit[], usersById: Map<string, User>): CareNoteResult[] {
    return visits
      .flatMap((v) => v.notes)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, NOTES_LIMIT)
      .map((note) => ({
        authorName: usersById.get(note.authorId)?.name.fullName ?? null,
        audience: String(note.audience),
        at: note.createdAt,
        text: note.text,
      }));
  }

  private nextScheduledVisit(visits: Visit[], today: Date): Date | null {
    const upcoming = visits
      .filter(
        (v) => v.scheduledDate.getTime() >= today.getTime() && v.status === VisitStatus.Scheduled,
      )
      .sort((a, b) => this.chronologyKey(a) - this.chronologyKey(b));
    if (upcoming.length === 0) {
      return null;
    }
    const next = upcoming[0];
    return new Date(next.scheduledDate.getTime() + next.window.startMinute * 60_000);
  }

  private ownerContact(owner: User): ContactResult {
    return {
      name: owner.name.fullName,
      relationship: owner.relationshipToRecipient,
      phone: owner.phone.value,
    };
  }

  private caregiverName(visit: Visit, usersById: Map<string, User>): string | null {
    if (visit.caregiverId === null) {
      return null;
    }
    return usersById.get(visit.caregiverId)?.name.fullName ?? null;
  }

  private chronologyKey(visit: Visit): number {
    return visit.scheduledDate.getTime() + visit.window.startMinute * 60_000;
  }

  private isMissedOrLate(visit: Visit): boolean {
    if (visit.status === VisitStatus.Missed) {
      return true;
    }
    if (visit.clockInAt === null) {
      return false;
    }
    const arrivalMinute = visit.clockInAt.getUTCHours() * 60 + visit.clockInAt.getUTCMinutes();
    return arrivalMinute > visit.window.startMinute + LATE_GRACE_MINUTES;
  }
}

/** Midnight (UTC) of the day the given instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Whole years between a date of birth and the given current date. */
function ageInYears(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}
