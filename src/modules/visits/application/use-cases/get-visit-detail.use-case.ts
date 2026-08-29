import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { ageInYears } from '../age.util';
import { VisitDetailResult } from '../dto/visit-detail.result';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';
import {
  OWNER_CONTACT_DIRECTORY,
  OwnerContactDirectory,
} from '../ports/owner-contact-directory.port';
import { toIsoDate } from '../schedule-date.util';

export interface GetVisitDetailQuery {
  caregiverId: string;
  visitId: string;
}

/**
 * Use case: the full appointment detail for one of the caregiver's own visits.
 *
 * A visit that does not exist or belongs to another caregiver is reported as not
 * found, so the endpoint never discloses another caregiver's visits. The
 * recipient's identity, health note and address are read from the care recipients
 * context and the emergency contact from the family owner's account; the visit
 * itself supplies the tasks and special instructions.
 */
@Injectable()
export class GetVisitDetailUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    @Inject(OWNER_CONTACT_DIRECTORY) private readonly ownerContacts: OwnerContactDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: GetVisitDetailQuery): Promise<VisitDetailResult> {
    const visit = await this.visits.findById(query.visitId);
    if (visit === null || visit.caregiverId !== query.caregiverId) {
      throw new NotFoundDomainException('Visit not found');
    }

    const snapshots = await this.recipients.lookup([visit.careRecipientId]);
    const recipient = snapshots.get(visit.careRecipientId);
    if (recipient === undefined) {
      throw new NotFoundDomainException('Visit not found');
    }

    const contact = await this.ownerContacts.findContact(recipient.ownerId);

    const administrationsByMedication = new Map(
      visit.medicationAdministrations.map((administration) => [
        administration.medicationId,
        administration,
      ]),
    );
    const medications = recipient.medications.map((medication) => {
      const administration = administrationsByMedication.get(medication.id);
      return {
        id: medication.id,
        name: medication.name,
        dose: medication.dose,
        scheduleMinute: medication.scheduleMinute,
        administration:
          administration === undefined
            ? null
            : {
                outcome: administration.outcome,
                note: administration.note,
                recordedAt: administration.recordedAt.toISOString(),
              },
      };
    });

    const vitals = visit.vitals.map((reading) => ({
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      heartRate: reading.heartRate,
      oxygenSaturation: reading.oxygenSaturation,
      weightGrams: reading.weightGrams,
      temperatureCelsius: reading.temperatureCelsius,
      recordedAt: reading.recordedAt.toISOString(),
    }));

    return {
      id: visit.id,
      status: visit.status,
      date: toIsoDate(visit.scheduledDate),
      startMinute: visit.window.startMinute,
      endMinute: visit.window.endMinute,
      clockInAt: visit.clockInAt === null ? null : visit.clockInAt.toISOString(),
      clockOutAt: visit.clockOutAt === null ? null : visit.clockOutAt.toISOString(),
      breakSeconds: visit.breakSeconds,
      onBreakSince: visit.onBreakSince === null ? null : visit.onBreakSince.toISOString(),
      address: recipient.fullAddress,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        gender: recipient.gender,
        age: ageInYears(recipient.dateOfBirth, this.clock.now()),
        photoKey: recipient.photoKey,
      },
      tasks: visit.tasks.map((task) => ({ label: task.label, completed: task.completed })),
      specialInstructions: visit.specialInstructions,
      healthNote: {
        medicalConditions: recipient.medicalConditions,
        allergies: recipient.allergies,
      },
      medications,
      vitals,
      observation: {
        mood: visit.observation.mood,
        appetite: visit.observation.appetite,
        mobility: visit.observation.mobility,
        medicationStatus: visit.observation.medicationStatus,
      },
      notes: visit.notes.map((note) => ({
        authorId: note.authorId,
        audience: String(note.audience),
        text: note.text,
        createdAt: note.createdAt.toISOString(),
      })),
      photoKeys: visit.photoKeys,
      emergencyContact: contact === null ? null : { name: contact.name, phone: contact.phone },
    };
  }
}
