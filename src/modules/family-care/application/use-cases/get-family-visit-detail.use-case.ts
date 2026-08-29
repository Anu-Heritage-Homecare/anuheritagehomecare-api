import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { USER_REPOSITORY, UserRepository } from '@modules/identity/domain/user.repository';
import { VISIT_REPOSITORY, VisitRepository } from '@modules/visits/domain/visit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CareRecipient } from '@modules/care-recipients/domain/care-recipient.entity';
import { Visit } from '@modules/visits/domain/visit.entity';
import { ageInYears } from '../family-care-date.util';
import {
  FamilyTimelineEventResult,
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

    const caregiver = await this.users.findById(visit.caregiverId);
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
      caregiver: caregiverName === null ? null : { id: visit.caregiverId, name: caregiverName },
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
      notes: this.buildNotes(visit, caregiverName),
      photoKeys: visit.photoKeys,
    };
  }

  private buildTimeline(visit: Visit, recipient: CareRecipient): FamilyTimelineEventResult[] {
    const medicationNames = new Map(recipient.medications.map((med) => [med.id, med.name]));
    const events: FamilyTimelineEventResult[] = [];

    if (visit.clockInAt !== null) {
      events.push({
        at: visit.clockInAt.toISOString(),
        kind: 'ARRIVED',
        label: 'Arrives at home',
        detail: null,
      });
    }
    for (const task of visit.tasks) {
      if (task.completedAt !== null) {
        events.push({
          at: task.completedAt.toISOString(),
          kind: 'TASK',
          label: `${task.label} completed`,
          detail: null,
        });
      }
    }
    for (const administration of visit.medicationAdministrations) {
      const name = medicationNames.get(administration.medicationId) ?? 'Medication';
      events.push({
        at: administration.recordedAt.toISOString(),
        kind: 'MEDICATION',
        label: `${name} ${MEDICATION_LABEL[String(administration.outcome)] ?? 'recorded'}`,
        detail: null,
      });
    }
    for (const reading of visit.vitals) {
      const hasBp = reading.systolic !== null || reading.diastolic !== null;
      events.push({
        at: reading.recordedAt.toISOString(),
        kind: 'VITALS',
        label: hasBp ? 'Blood pressure recorded' : 'Vitals recorded',
        detail: hasBp ? `${reading.systolic ?? '-'}/${reading.diastolic ?? '-'} mmHg` : null,
      });
    }
    if (visit.clockOutAt !== null) {
      events.push({
        at: visit.clockOutAt.toISOString(),
        kind: 'DEPARTED',
        label: 'Visit completed',
        detail: null,
      });
    }

    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
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

  private buildNotes(visit: Visit, caregiverName: string | null): FamilyVisitNoteResult[] {
    const at = visit.updatedAt.toISOString();
    const notes: FamilyVisitNoteResult[] = [];
    if (visit.visitNote !== null) {
      notes.push({ author: caregiverName, at, audience: 'CARE_TEAM', text: visit.visitNote });
    }
    if (visit.familyNote !== null) {
      notes.push({ author: caregiverName, at, audience: 'FAMILY', text: visit.familyNote });
    }
    return notes;
  }
}
