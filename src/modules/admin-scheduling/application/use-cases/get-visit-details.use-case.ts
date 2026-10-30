import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeofenceConfig } from '@config/configuration';
import { Coordinates } from '@shared/domain/coordinates.vo';
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
import { VisitNote } from '@modules/visits/domain/value-objects/visit-note.vo';
import { VisitNoteSource } from '@modules/visits/domain/value-objects/visit-note-source.enum';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  RelatedVisitResult,
  VisitCarePlanResult,
  VisitCaregiverResult,
  VisitCheckInResult,
  VisitDetailResult,
  VisitLocationResult,
  VisitNoteResult,
  VisitNotesResult,
  VisitRecipientResult,
  VisitTimelineEventResult,
} from '../dto/visit-details.result';
import {
  VISIT_LOCATION_READ_MODEL,
  VisitLocationReadModel,
} from '../ports/visit-location-read.port';
import {
  displayPriority,
  displayService,
  displayStatus,
  formatMinute,
} from '../scheduling-view.util';

const DAY_MS = 86_400_000;
const RELATED_WINDOW_DAYS = 120;
/** How many recent location pings the operational log shows. */
const LOCATION_LOG_LIMIT = 20;
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
    @Inject(VISIT_LOCATION_READ_MODEL) private readonly locations: VisitLocationReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly config: ConfigService,
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
    const ownerCountry = ownerId === null ? null : (userById.get(ownerId)?.address.country ?? null);

    // Resolve the title and branch (division) of every caregiver who authored a note.
    const noteCaregiverIds = [
      ...new Set(
        visit.notes
          .filter((n) => n.source === VisitNoteSource.Caregiver && n.authorId !== null)
          .map((n) => n.authorId as string),
      ),
    ];
    const noteProfiles = await Promise.all(
      noteCaregiverIds.map((id) => this.profiles.findByUserId(id).then((p) => [id, p] as const)),
    );
    const profilesById = new Map(
      noteProfiles
        .filter(([, p]) => p !== null)
        .map(([id, p]) => [id, { title: p?.title ?? null, branch: p?.branch ?? null }]),
    );
    const noteItems = this.noteItems(visit, userById, profilesById);

    return {
      id: visit.id,
      reference: visitReference(visit, ownerCountry),
      status: String(visit.status),
      statusLabel: displayStatus(String(visit.status), visit.caregiverId),
      serviceType: displayService(String(visit.type)),
      priority: displayPriority(String(visit.priority)),
      checkIn: this.checkIn(visit),
      location: await this.location(visit, recipient),
      actions: {
        canEdit: String(visit.status) === 'SCHEDULED',
        canReassign: String(visit.status) === 'SCHEDULED',
        canCancel: String(visit.status) === 'SCHEDULED',
      },
      overview: {
        information: this.information(visit, recipient),
        tasks: this.tasks(visit, recipient),
        notes: noteItems,
      },
      recipient: this.recipientCard(recipient, visit, userById, now),
      caregiver,
      carePlan: this.carePlan(visit, recipient),
      notes: this.notesSection(noteItems),
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

  private checkIn(visit: Visit): VisitCheckInResult {
    const arrival = visit.arrivalLocation;
    const dayMs = visit.scheduledDate.getTime();
    return {
      // A verified check-in means the clock-in was accepted inside the geofence,
      // which stamps the arrival coordinates.
      verified: arrival !== null,
      clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
      clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
      arrivalLatitude: arrival?.latitude ?? null,
      arrivalLongitude: arrival?.longitude ?? null,
      scheduledStart: new Date(dayMs + visit.window.startMinute * 60_000).toISOString(),
      scheduledEnd: new Date(dayMs + visit.window.endMinute * 60_000).toISOString(),
    };
  }

  /**
   * The Location and Check-in tab: the geofence verification (how far the accepted
   * check-in and the latest ping are from the pinned address centre, against the
   * configured radius) and the real-time operational log of the visit's pings.
   */
  private async location(
    visit: Visit,
    recipient: Awaited<ReturnType<CareRecipientRepository['findById']>>,
  ): Promise<VisitLocationResult> {
    const centre = recipient?.profile.location ?? null;
    const arrival = visit.arrivalLocation;
    const radiusMeters = this.config.getOrThrow<GeofenceConfig>('geofence').radiusMeters;

    const checkInVarianceMeters =
      centre === null || arrival === null ? null : Math.round(centre.distanceToMeters(arrival));

    const pings = await this.locations.pingsForVisit(visit.id, LOCATION_LOG_LIMIT);
    const latest = pings[0];
    const current =
      latest === undefined ? null : Coordinates.create(latest.latitude, latest.longitude);
    const currentOffsetMeters =
      centre === null || current === null ? null : Math.round(centre.distanceToMeters(current));

    const logs = pings.map((ping) => ({
      type: 'GPS_PING',
      label: 'GPS Location Ping Verified',
      method: pingMethod(ping.mode),
      at: ping.recordedAt.toISOString(),
      status: 'VERIFIED',
    }));
    if (visit.clockInAt !== null) {
      logs.push({
        type: 'CHECK_IN',
        label: 'Initial Check-in Dispatch Verified',
        method: 'Manual app action with GPS coordinate lock',
        at: visit.clockInAt.toISOString(),
        status: 'VERIFIED',
      });
    }
    logs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      address: recipient?.profile.fullAddress ?? 'Unknown',
      geofenceRadiusMeters: radiusMeters,
      checkInVarianceMeters,
      checkInWithinRange:
        checkInVarianceMeters === null ? null : checkInVarianceMeters <= radiusMeters,
      recipientLatitude: centre?.latitude ?? null,
      recipientLongitude: centre?.longitude ?? null,
      currentLatitude: current?.latitude ?? null,
      currentLongitude: current?.longitude ?? null,
      currentOffsetMeters,
      lastPingAt: latest?.recordedAt.toISOString() ?? null,
      // The check-out verification procedure; office set copy until a policy model exists.
      verificationPlan: 'GPS Geofence + Photo Note',
      logs,
    };
  }

  private tasks(
    visit: Visit,
    recipient: Awaited<ReturnType<CareRecipientRepository['findById']>>,
  ): VisitDetailResult['overview']['tasks'] {
    const medicationById = new Map(
      (recipient?.medications ?? []).map((m) => [m.id, { name: m.name, dose: m.dose }]),
    );

    const items = visit.tasks.map((task, index) => {
      const vitals = visit.vitals
        .filter((v) => v.visitTaskPosition === index)
        .map((v) => ({ summary: taskVitalsSummary(v), recordedAt: v.recordedAt.toISOString() }));
      const medications = visit.medicationAdministrations
        .filter((m) => m.visitTaskPosition === index)
        .map((m) => {
          const info = medicationById.get(m.medicationId);
          return {
            name: info?.name ?? 'Medication',
            dose: info?.dose ?? null,
            outcome: String(m.outcome),
          };
        });
      const status = task.completed
        ? 'COMPLETED'
        : task.startedAt !== null
          ? 'IN_PROGRESS'
          : 'PENDING';
      return {
        label: task.label,
        category: String(task.category),
        completed: task.completed,
        status,
        scheduledTime: task.scheduledMinute === null ? null : formatMinute(task.scheduledMinute),
        startedAt: task.startedAt === null ? null : task.startedAt.toISOString(),
        completedAt: task.completedAt === null ? null : task.completedAt.toISOString(),
        durationMinutes: task.durationMinutes,
        note: task.note,
        vitals,
        medications,
      };
    });
    const completed = items.filter((t) => t.completed).length;
    return {
      summary: `${completed} of ${items.length} completed`,
      completed,
      total: items.length,
      items,
    };
  }

  private noteItems(
    visit: Visit,
    userById: Map<string, { name: { firstName: string; lastName: string }; userType: UserType }>,
    profilesById: Map<string, { title: string | null; branch: string | null }>,
  ): VisitNoteResult[] {
    return visit.notes
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((note) => {
        const author = resolveNoteAuthor(note, userById, profilesById);
        return {
          id: note.id,
          source: String(note.source),
          authorName: author.name,
          authorRole: author.role,
          audience: String(note.audience),
          text: note.text,
          at: note.createdAt.toISOString(),
          acknowledged: note.acknowledgedAt !== null,
          acknowledgedByName: note.acknowledgedByName,
          flaggedForCoordinator: note.flaggedForCoordinator,
          edited: note.editedAt !== null,
          canEdit: note.source === VisitNoteSource.Coordinator,
          replies: note.replies.map((reply) => ({
            authorName: reply.authorName,
            authorRole: reply.authorRole,
            text: reply.text,
            at: reply.createdAt.toISOString(),
          })),
        };
      });
  }

  private notesSection(items: VisitNoteResult[]): VisitNotesResult {
    return {
      counts: {
        all: items.length,
        caregiver: items.filter((n) => n.source === 'CAREGIVER').length,
        coordinator: items.filter((n) => n.source === 'COORDINATOR').length,
        system: items.filter((n) => n.source === 'SYSTEM').length,
      },
      items,
    };
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
    const push = (
      type: string,
      label: string,
      at: Date,
      status: string,
      detail: string | null = null,
    ): void => {
      events.push({ type, label, detail, at: at.toISOString(), status });
    };
    const dayMs = visit.scheduledDate.getTime();

    if (visit.clockInAt !== null) {
      push('CLOCK_IN', `${caregiverName} checked in`, visit.clockInAt, 'DONE');
    }
    for (const vitals of visit.vitals) {
      push('VITALS', 'Vital signs recorded', vitals.recordedAt, 'DONE', taskVitalsSummary(vitals));
    }
    for (const med of visit.medicationAdministrations) {
      push(
        'MEDICATION',
        `Medication ${String(med.outcome).toLowerCase().replace(/_/g, ' ')}`,
        med.recordedAt,
        'DONE',
        med.note,
      );
    }
    for (const task of visit.tasks) {
      if (task.completed && task.completedAt !== null) {
        push('TASK', `${task.label} completed`, task.completedAt, 'DONE', task.note);
      } else if (task.startedAt !== null) {
        push('TASK_STARTED', `${task.label} started`, task.startedAt, 'IN_PROGRESS', task.note);
      } else if (task.scheduledMinute !== null) {
        push(
          'TASK_UPCOMING',
          task.label,
          new Date(dayMs + task.scheduledMinute * 60_000),
          'UPCOMING',
        );
      }
    }
    for (const note of visit.notes) {
      push('NOTE', 'Note added', note.createdAt, 'DONE', note.text);
    }
    for (const brk of visit.breaks) {
      push('BREAK_START', 'Break started', brk.startedAt, 'DONE');
      if (brk.endedAt !== null) {
        push('BREAK_END', 'Break ended', brk.endedAt, 'DONE');
      }
    }
    if (visit.clockOutAt !== null) {
      push('CLOCK_OUT', `${caregiverName} checked out`, visit.clockOutAt, 'DONE');
    } else {
      // The planned final step; shown as an upcoming entry until the caregiver clocks out.
      push(
        'SCHEDULED_CHECK_OUT',
        'Scheduled check-out',
        new Date(dayMs + visit.window.endMinute * 60_000),
        'UPCOMING',
      );
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

/** The display name and role for a note author (resolved for caregivers, snapshot otherwise). */
function resolveNoteAuthor(
  note: VisitNote,
  userById: Map<string, { name: { firstName: string; lastName: string }; userType: UserType }>,
  profilesById: Map<string, { title: string | null; branch: string | null }>,
): { name: string; role: string } {
  if (note.source === VisitNoteSource.Caregiver && note.authorId !== null) {
    const user = userById.get(note.authorId);
    const name = user === undefined ? 'Unknown' : `${user.name.firstName} ${user.name.lastName}`;
    const profile = profilesById.get(note.authorId);
    const title = profile?.title ?? (user === undefined ? 'Caregiver' : roleLabel(user.userType));
    const role = profile?.branch ? `${title} • ${profile.branch} Division` : title;
    return { name, role };
  }
  const fallbackName = note.source === VisitNoteSource.System ? 'System' : 'Coordinator';
  return { name: note.authorName ?? fallbackName, role: note.authorRole ?? '' };
}

/** The verification method label for a location ping, by its tracking mode. */
function pingMethod(mode: string): string {
  switch (mode) {
    case 'EMERGENCY':
      return 'Emergency high frequency tracking';
    case 'NAVIGATION':
      return 'Automatic GPS navigation verification';
    default:
      return 'Automatic GPS background verification';
  }
}

/** A readable one line summary of a vitals reading for a Care Tasks card. */
function taskVitalsSummary(v: {
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  oxygenSaturation: number | null;
  temperatureCelsius: number | null;
  bloodGlucose: number | null;
}): string {
  const parts: string[] = [];
  if (v.systolic !== null && v.diastolic !== null) {
    parts.push(`BP ${v.systolic}/${v.diastolic} mmHg`);
  }
  if (v.heartRate !== null) {
    parts.push(`HR ${v.heartRate} bpm`);
  }
  if (v.oxygenSaturation !== null) {
    parts.push(`SpO2 ${v.oxygenSaturation}%`);
  }
  if (v.temperatureCelsius !== null) {
    parts.push(`Temp ${v.temperatureCelsius} C`);
  }
  if (v.bloodGlucose !== null) {
    parts.push(`Glucose ${v.bloodGlucose} mg/dL`);
  }
  return parts.length === 0 ? 'Vitals recorded' : parts.join(', ');
}

/** VIS-<country>-<year>-<sequence>; country from the owner's market, XX when unknown. */
function visitReference(visit: Visit, country: string | null): string {
  const prefix = country ?? 'XX';
  const seq = visit.sequence ?? 0;
  return `VIS-${prefix}-${visit.scheduledDate.getUTCFullYear()}-${String(seq).padStart(4, '0')}`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
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
