import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { MedicationAdministrationOutcome } from '../../domain/medication-administration-outcome.enum';
import { VISIT_REPOSITORY, VisitRepository } from '../../domain/visit.repository';
import { MedicationAdministrationResult } from '../dto/visit-care.result';
import { loadOwnedVisit } from '../load-owned-visit';
import {
  CARE_RECIPIENT_DIRECTORY,
  CareRecipientDirectory,
} from '../ports/care-recipient-directory.port';

export interface RecordMedicationAdministrationCommand {
  caregiverId: string;
  visitId: string;
  medicationId: string;
  outcome: MedicationAdministrationOutcome;
  note?: string | null;
}

/**
 * Use case: a caregiver records what happened with one scheduled medication
 * during their visit. The visit must be theirs and in progress, and the
 * medication must belong to the visit's recipient, so an outcome can never be
 * recorded against an unrelated medication.
 */
@Injectable()
export class RecordMedicationAdministrationUseCase {
  constructor(
    @Inject(VISIT_REPOSITORY) private readonly visits: VisitRepository,
    @Inject(CARE_RECIPIENT_DIRECTORY) private readonly recipients: CareRecipientDirectory,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: RecordMedicationAdministrationCommand,
  ): Promise<MedicationAdministrationResult> {
    const visit = await loadOwnedVisit(this.visits, command.visitId, command.caregiverId);

    const snapshots = await this.recipients.lookup([visit.careRecipientId]);
    const recipient = snapshots.get(visit.careRecipientId);
    const medication = recipient?.medications.find(
      (candidate) => candidate.id === command.medicationId,
    );
    if (medication === undefined) {
      throw new NotFoundDomainException('Medication not found on this visit');
    }

    const administration = visit.recordMedication({
      medicationId: command.medicationId,
      outcome: command.outcome,
      note: command.note,
      now: this.clock.now(),
    });
    await this.visits.save(visit);

    return {
      medicationId: administration.medicationId,
      outcome: administration.outcome,
      note: administration.note,
      recordedAt: administration.recordedAt.toISOString(),
    };
  }
}
