import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CareFrequency } from '@modules/care-recipients/domain/care-frequency.enum';
import { Weekday } from '@modules/care-recipients/domain/weekday.enum';
import {
  CARE_RATING_REPOSITORY,
  CareRatingRepository,
} from '@modules/care-ratings/domain/care-rating.repository';
import {
  CAREGIVER_PROFILE_REPOSITORY,
  CaregiverProfileRepository,
} from '@modules/caregiver-profile/domain/caregiver-profile.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { UserType } from '@modules/identity/domain/user-type.enum';
import { Visit } from '@modules/visits/domain/visit.entity';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  RelatedVisitResult,
  VisitCarePlanResult,
  VisitCaregiverResult,
  VisitDetailResult,
  VisitNoteResult,
  VisitRecipientResult,
  VisitTimelineEventResult,
} from '../dto/visit-details.result';
import {
  displayPriority,
  displayService,
  displayStatus,
  formatMinute,
} from '../scheduling-view.util';

const DAY_MS = 86_400_000;
const RELATED_WINDOW_DAYS = 120;
const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.Monday]: 'Mon',
  [Weekday.Tuesday]: 'Tue',
  [Weekday.Wednesday]: 'Wed',
  [Weekday.Thursday]: 'Thu',
  [Weekday.Friday]: 'Fri',
  [Weekday.Saturday]: 'Sat',
  [Weekday.Sunday]: 'Sun',
};
const CARE_LEVEL_LABELS: Record<CareFrequency, string> = {
  [CareFrequency.OneTimeVisit]: 'One time',
  [CareFrequency.Daily]: 'Full-Time',
  [CareFrequency.Weekly]: 'Part-Time',
  [CareFrequency.LiveInCare]: 'Live-in',
};

/**
 * The admin Visit Details screen. Composes a single visit with its recipient, its
 * assigned caregiver, a timeline derived from the visit's own events, the care plan
 * and the previous and next related visits. Read only; all name lookups are batched.
 */
@Injectable()
export class GetVisitDetailsUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CAREGIVER_PROFILE_REPOSITORY) private readonly profiles: CaregiverProfileRepository,
    @Inject(CARE_RATING_REPOSITORY) private readonly ratings: CareRatingRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(visitId: string): Promise<VisitDetailResult> {
    const visit = await this.visits.findById(visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const now = this.clock.now();
    const recipient = await this.recipients.findById(visit.careRecipientId);

    const related = await this.relatedVisits(visit);
    const noteAuthorIds = visit.notes.map((n) => n.authorId);
    const relatedCaregiverIds = related
      .map((v) => v.caregiverId)
      .filter((id): id is string => id !== null);
    const ownerId = recipient === null ? null : recipient.ownerId;

    const userIds = [
      ...new Set(
        [visit.caregiverId, ownerId, ...noteAuthorIds, ...relatedCaregiverIds].filter(
          (id): id is string => id !== null,
        ),
      ),
    ];
    const users = userIds.length === 0 ? [] : await this.users.findByIds(userIds);
    const userById = new Map(users.map((u) => [u.id, u]));

    const caregiver = await this.caregiverCard(visit, userById, now);

    return {
      id: visit.id,
      status: String(visit.status),
      statusLabel: displayStatus(String(visit.status), visit.caregiverId),
      serviceType: displayService(String(visit.type)),
      priority: displayPriority(String(visit.priority)),
      actions: {
        canEdit: String(visit.status) === 'SCHEDULED',
        canReassign: String(visit.status) === 'SCHEDULED',
        canCancel: String(visit.status) === 'SCHEDULED',
      },
      overview: {
        information: this.information(visit, recipient),
        tasks: this.tasks(visit),
        notes: this.notes(visit, userById),
      },
      recipient: this.recipientCard(recipient, visit, userById, now),
      caregiver,
      carePlan: this.carePlan(visit, recipient),
      notes: this.notes(visit, userById),
      history: this.timeline(visit, userById),
      relatedVisits: this.relatedResults(related, userById, visit),
    };
  }

  private information(
    visit: Visit,
    recipient: Awaited<ReturnType<CareRecipientRepository['findById']>>,
  ): VisitDetailResult['overview']['information'] {
    const start = visit.window.startMinute;
    const end = visit.window.endMinute;
    const days = recipient?.schedule?.days ?? [];
    const recurring =
      days.length > 0 ? `Yes — ${days.map((d) => WEEKDAY_LABELS[d]).join(' / ')}` : 'No';
    return {
      date: visit.scheduledDate.toISOString(),
      time: formatMinute(start),
      endTime: formatMinute(end),
      durationHours: round1((end - start) / 60),
      serviceType: displayService(String(visit.type)),
      priority: displayPriority(String(visit.priority)),
      status: displayStatus(String(visit.status), visit.caregiverId),
      location: recipient?.profile.fullAddress ?? 'Unknown',
      recurring,
    };
  }

  private tasks(visit: Visit): VisitDetailResult['overview']['tasks'] {
    const items = visit.tasks.map((t) => ({
      label: t.label,
      completed: t.completed,
      status: t.completed ? 'Completed' : 'Pending',
    }));
    const completed = items.filter((t) => t.completed).length;
    return {
      summary: `${completed} of ${items.length} completed`,
      completed,
      total: items.length,
      items,
    };
  }

  private notes(
    visit: Visit,
    userById: Map<string, { name: { firstName: string; lastName: string }; userType: UserType }>,
  ): VisitNoteResult[] {
    return visit.notes
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((note) => {
        const user = userById.get(note.authorId);
        return {
          authorName:
            user === undefined ? 'Unknown' : `${user.name.firstName} ${user.name.lastName}`,
          authorRole: user === undefined ? '' : roleLabel(user.userType),
          audience: String(note.audience),
          text: note.text,
          at: note.createdAt.toISOString(),
        };
      });
  }

  private recipientCard(
    recipient: Awaited<ReturnType<CareRecipientRepository['findById']>>,
    visit: Visit,
    userById: Map<
      string,
      { name: { firstName: string; lastName: string }; phone: { value: string } }
    >,
    now: Date,
  ): VisitRecipientResult {
    if (recipient === null) {
      return {
        id: visit.careRecipientId,
        name: 'Unknown',
        age: null,
        gender: '',
        primaryCondition: null,
        careLevel: null,
        address: 'Unknown',
        emergencyContact: null,
        conditions: [],
        allergies: [],
        careNeeds: [],
        medications: [],
      };
    }
    const conditions = recipient.health?.medicalConditions ?? [];
    const owner = userById.get(recipient.ownerId);
    return {
      id: recipient.id,
      name: recipient.profile.name,
      age: ageInYears(recipient.profile.dateOfBirth, now),
      gender: titleCase(String(recipient.profile.gender)),
      primaryCondition: conditions[0] ?? null,
      careLevel:
        recipient.schedule === null ? null : CARE_LEVEL_LABELS[recipient.schedule.frequency],
      address: recipient.profile.fullAddress,
      emergencyContact:
        owner === undefined
          ? null
          : {
              name: `${owner.name.firstName} ${owner.name.lastName}`,
              phone: owner.phone.value,
              relationship: recipient.profile.relationship,
            },
      conditions,
      allergies: recipient.health?.allergies ?? [],
      careNeeds: recipient.careNeeds.map((need) => displayService(String(need))),
      medications: recipient.medications.map((m) => ({
        name: m.name,
        dose: m.dose,
        times: m.doseTimes.map((minute) => formatMinute(minute)),
      })),
    };
  }

  private async caregiverCard(
    visit: Visit,
    userById: Map<string, { name: { firstName: string; lastName: string } }>,
    now: Date,
  ): Promise<VisitCaregiverResult | null> {
    if (visit.caregiverId === null) {
      return null;
    }
    const user = userById.get(visit.caregiverId);
    const profile = await this.profiles.findByUserId(visit.caregiverId);
    const rating = await this.ratings.averageForCaregiver(visit.caregiverId);
    return {
      id: visit.caregiverId,
      name: user === undefined ? 'Unknown' : `${user.name.firstName} ${user.name.lastName}`,
      title: profile?.title ?? null,
      branch: profile?.branch ?? null,
      onVisit: String(visit.status) === 'IN_PROGRESS' || String(visit.status) === 'ON_BREAK',
      clockIn: visit.clockInAt === null ? null : formatClock(visit.clockInAt, now),
      performanceRating: rating.average === null ? null : Math.round(rating.average * 10) / 10,
    };
  }

  private carePlan(
    visit: Visit,
    recipient: Awaited<ReturnType<CareRecipientRepository['findById']>>,
  ): VisitCarePlanResult {
    const schedule = recipient?.schedule ?? null;
    return {
      serviceType: displayService(String(visit.type)),
      frequency:
        schedule === null ? null : titleCase(String(schedule.frequency).replace(/_/g, ' ')),
      days: (schedule?.days ?? []).map((d) => WEEKDAY_LABELS[d]),
      startTime: schedule?.startMinute == null ? null : formatMinute(schedule.startMinute),
      durationHours: round1((visit.window.endMinute - visit.window.startMinute) / 60),
      expectedDuration: schedule?.expectedDuration ?? null,
      services: recipient?.careNeeds.map((need) => displayService(String(need))) ?? [],
      instructions: visit.specialInstructions,
      // Care goals are office set on a dedicated surface; empty until that is built.
      goals: [],
    };
  }

  private timeline(
    visit: Visit,
    userById: Map<string, { name: { firstName: string; lastName: string } }>,
  ): VisitTimelineEventResult[] {
    const caregiverName =
      visit.caregiverId === null
        ? 'The caregiver'
        : (() => {
            const u = userById.get(visit.caregiverId);
            return u === undefined ? 'The caregiver' : `${u.name.firstName} ${u.name.lastName}`;
          })();

    const events: VisitTimelineEventResult[] = [];
    const push = (type: string, label: string, at: Date): void => {
      events.push({ type, label, at: at.toISOString() });
    };

    if (visit.clockInAt !== null) {
      push('CLOCK_IN', `${caregiverName} clocked in`, visit.clockInAt);
    }
    for (const vitals of visit.vitals) {
      push('VITALS', `Vitals recorded${vitalsSummary(vitals)}`, vitals.recordedAt);
    }
    for (const med of visit.medicationAdministrations) {
      push('MEDICATION', `Medication ${String(med.outcome).toLowerCase()}`, med.recordedAt);
    }
    for (const task of visit.tasks) {
      if (task.completed && task.completedAt !== null) {
        push('TASK', `Task completed: ${task.label}`, task.completedAt);
      }
    }
    for (const note of visit.notes) {
      push('NOTE', 'Note added', note.createdAt);
    }
    for (const brk of visit.breaks) {
      push('BREAK_START', 'Break started', brk.startedAt);
      if (brk.endedAt !== null) {
        push('BREAK_END', 'Break ended', brk.endedAt);
      }
    }
    if (visit.clockOutAt !== null) {
      push('CLOCK_OUT', `${caregiverName} clocked out`, visit.clockOutAt);
    }
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  private async relatedVisits(visit: Visit): Promise<Visit[]> {
    const from = new Date(visit.scheduledDate.getTime() - RELATED_WINDOW_DAYS * DAY_MS);
    const to = new Date(visit.scheduledDate.getTime() + RELATED_WINDOW_DAYS * DAY_MS);
    const all = await this.visits.listForCareRecipientsInRange([visit.careRecipientId], from, to);
    return all.filter((v) => v.id !== visit.id);
  }

  private relatedResults(
    related: Visit[],
    userById: Map<string, { name: { firstName: string; lastName: string } }>,
    visit: Visit,
  ): { previous: RelatedVisitResult | null; next: RelatedVisitResult | null } {
    const key = (v: Visit): number => v.scheduledDate.getTime() + v.window.startMinute * 60_000;
    const currentKey = key(visit);
    const before = related.filter((v) => key(v) < currentKey).sort((a, b) => key(b) - key(a));
    const after = related.filter((v) => key(v) > currentKey).sort((a, b) => key(a) - key(b));
    const toResult = (v: Visit | undefined): RelatedVisitResult | null => {
      if (v === undefined) {
        return null;
      }
      const u = v.caregiverId === null ? undefined : userById.get(v.caregiverId);
      const who = u === undefined ? 'Unassigned' : `${u.name.firstName} ${u.name.lastName}`;
      return {
        id: v.id,
        date: v.scheduledDate.toISOString(),
        label: `${displayService(String(v.type))} • ${who}`,
        status: displayStatus(String(v.status), v.caregiverId),
      };
    };
    return { previous: toResult(before[0]), next: toResult(after[0]) };
  }
}

function roleLabel(type: UserType): string {
  return type === UserType.Caregiver ? 'Caregiver' : 'Family';
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function vitalsSummary(vitals: {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
}): string {
  const parts: string[] = [];
  if (vitals.systolic !== null && vitals.diastolic !== null) {
    parts.push(`BP ${vitals.systolic}/${vitals.diastolic}`);
  }
  if (vitals.heartRate !== null) {
    parts.push(`HR ${vitals.heartRate}`);
  }
  return parts.length === 0 ? '' : `: ${parts.join(', ')}`;
}

/** Clock time (UTC) like 9:28 AM. */
function formatClock(value: Date, _now: Date): string {
  const minute = value.getUTCHours() * 60 + value.getUTCMinutes();
  return formatMinute(minute);
}

function ageInYears(dateOfBirth: Date, now: Date): number | null {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
