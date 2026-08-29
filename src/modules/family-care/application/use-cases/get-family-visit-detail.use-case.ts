import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { User } from '@modules/identity/domain/user.entity';
import { Visit } from '@modules/visits/domain/visit.entity';
import { ageInYears } from '../family-care-date.util';
import {
  FamilyTimelineEventResult,
  FamilyTimelineKind,
  FamilyVisitDetailResult,
  FamilyVisitNoteResult,
} from '../dto/family-visit.result';

export interface GetFamilyVisitDetailQuery {
  ownerId: string;
  visitId: string;
}

const MEDICATION_LABEL: Record<string, string> = {
  ADMINISTERED: 'given',
  REFUSED: 'refused',
  OUT_OF_STOCK: 'out of stock',
  PATIENT_ASLEEP: 'skipped, patient asleep',
};

/**
 * Use case: the full visit detail a family owner sees, with a merged activity
 * timeline, the task checklist, health (latest vitals and observations), notes
 * and photos. The visit's recipient must belong to the owner, otherwise it is
 * reported as not found so another family's visit is never disclosed.
 */
@Injectable()
export class GetFamilyVisitDetailUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetFamilyVisitDetailQuery): Promise<FamilyVisitDetailResult> {
    const visit = await this.visits.findById(query.visitId);
    if (visit === null) {
      throw new NotFoundDomainException('Visit not found');
    }
    const recipient = await this.recipients.findById(visit.careRecipientId);
    if (recipient === null || recipient.ownerId !== query.ownerId) {
      throw new NotFoundDomainException('Visit not found');
    }

    const userIds = [...new Set([visit.caregiverId, ...visit.notes.map((note) => note.authorId)])];
    const usersById = new Map((await this.users.findByIds(userIds)).map((user) => [user.id, user]));
    const caregiver = usersById.get(visit.caregiverId) ?? null;
    const caregiverName =
      caregiver === null ? null : `${caregiver.name.firstName} ${caregiver.name.lastName}`.trim();

    return {
      id: visit.id,
      status: String(visit.status),
      date: visit.scheduledDate.toISOString().slice(0, 10),
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
      clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
      caregiver:
        caregiver === null || caregiverName === null
          ? null
          : { id: visit.caregiverId, name: caregiverName, photoKey: caregiver.photoKey },
      recipient: {
        id: recipient.id,
        name: recipient.profile.name,
        gender: String(recipient.profile.gender),
        age: ageInYears(recipient.profile.dateOfBirth, this.clock.now()),
        photoKey: recipient.profile.photoKey,
      },
      timeline: this.buildTimeline(visit, recipient),
      tasks: visit.tasks.map((task) => ({ label: task.label, completed: task.completed })),
      health: this.buildHealth(visit),
      notes: this.buildNotes(visit, usersById),
      photos: visit.photoKeys.map((key) => ({ key, url: this.photoStorage.urlFor(key) })),
    };
  }

  private buildTimeline(visit: Visit, recipient: CareRecipient): FamilyTimelineEventResult[] {
    const medicationNames = new Map(recipient.medications.map((med) => [med.id, med.name]));
    const done: (FamilyTimelineEventResult & { at: string })[] = [];

    const record = (
      at: Date,
      kind: FamilyTimelineKind,
      label: string,
      detail: string | null = null,
    ): void => {
      done.push({ at: at.toISOString(), kind, status: 'DONE', label, detail });
    };

    if (visit.clockInAt !== null) {
      record(visit.clockInAt, 'ARRIVED', 'Arrives at home');
    }
    for (const task of visit.tasks) {
      if (task.completedAt !== null) {
        const detail = task.durationMinutes === null ? null : `${task.durationMinutes} Minutes`;
        record(task.completedAt, 'TASK', `${task.label} completed`, detail);
      }
    }
    for (const administration of visit.medicationAdministrations) {
      const name = medicationNames.get(administration.medicationId) ?? 'Medication';
      record(
        administration.recordedAt,
        'MEDICATION',
        `${name} ${MEDICATION_LABEL[String(administration.outcome)] ?? 'recorded'}`,
      );
    }
    for (const reading of visit.vitals) {
      const hasBp = reading.systolic !== null || reading.diastolic !== null;
      record(
        reading.recordedAt,
        'VITALS',
        hasBp ? 'Blood pressure recorded' : 'Vitals recorded',
        hasBp ? `${reading.systolic ?? '-'}/${reading.diastolic ?? '-'} mmHg` : null,
      );
    }
    for (const entry of visit.breaks) {
      record(entry.startedAt, 'BREAK', 'Break started');
      if (entry.endedAt !== null) {
        record(entry.endedAt, 'BREAK', 'Break ended');
      }
    }
    if (visit.clockOutAt !== null) {
      record(visit.clockOutAt, 'DEPARTED', 'Visit completed');
    }

    done.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    // Tasks not yet ticked off are shown after the recorded events as upcoming,
    // greyed steps the caregiver still has to do.
    const upcoming: FamilyTimelineEventResult[] = visit.tasks
      .filter((task) => !task.completed)
      .map((task) => ({
        at: null,
        kind: 'TASK',
        status: 'UPCOMING',
        label: task.label,
        detail: null,
      }));

    return [...done, ...upcoming];
  }

  private buildHealth(visit: Visit): FamilyVisitDetailResult['health'] {
    const readings = [...visit.vitals].sort(
      (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
    );
    const latest = readings.at(-1);
    return {
      vitals:
        latest === undefined
          ? null
          : {
              systolic: latest.systolic,
              diastolic: latest.diastolic,
              heartRate: latest.heartRate,
              temperatureCelsius: latest.temperatureCelsius,
              oxygenSaturation: latest.oxygenSaturation,
              recordedAt: latest.recordedAt.toISOString(),
            },
      observation: {
        mood: visit.observation.mood,
        appetite: visit.observation.appetite,
        mobility: visit.observation.mobility,
        medicationStatus: visit.observation.medicationStatus,
      },
    };
  }

  private buildNotes(visit: Visit, usersById: Map<string, User>): FamilyVisitNoteResult[] {
    return [...visit.notes]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((note) => {
        const author = usersById.get(note.authorId) ?? null;
        return {
          authorId: note.authorId,
          authorName:
            author === null ? null : `${author.name.firstName} ${author.name.lastName}`.trim(),
          authorRole: author === null ? null : String(author.userType),
          authorPhotoKey: author?.photoKey ?? null,
          at: note.createdAt.toISOString(),
          audience: String(note.audience) as 'CARE_TEAM' | 'FAMILY',
          text: note.text,
        };
      });
  }
}
