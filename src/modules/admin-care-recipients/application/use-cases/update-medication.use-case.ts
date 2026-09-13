import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { MedicationAudit } from '@modules/care-recipients/domain/medication-audit.entity';
import {
  MEDICATION_AUDIT_REPOSITORY,
  MedicationAuditRepository,
} from '@modules/care-recipients/domain/medication-audit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface UpdateMedicationCommand {
  recipientId: string;
  medicationId: string;
  adminId: string;
  name: string;
  dose?: string | null;
  purpose?: string | null;
  prescribedBy?: string | null;
  startDate?: Date | null;
  instructions?: string | null;
  doseTimes?: number[] | null;
  note?: string | null;
}

/**
 * Use case: the admin edits an existing prescription. The editable fields are
 * replaced while the medication's identity and its active or discontinued status
 * are preserved (so administration history is kept), and the change is recorded on
 * the audit trail.
 */
@Injectable()
export class UpdateMedicationUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(MEDICATION_AUDIT_REPOSITORY) private readonly audits: MedicationAuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: UpdateMedicationCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const existing = recipient.findMedication(command.medicationId);
    if (existing === null) {
      throw new NotFoundDomainException('Medication not found');
    }

    const now = this.clock.now();
    const updated = existing.withUpdates({
      name: command.name,
      dose: command.dose,
      purpose: command.purpose,
      prescribedBy: command.prescribedBy,
      startDate: command.startDate,
      instructions: command.instructions,
      doseTimes: command.doseTimes,
    });
    recipient.replaceMedication(updated, now);
    await this.recipients.save(recipient);

    await this.audits.add(
      MedicationAudit.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        title: `${updated.name} updated`,
        detail: command.note?.trim() || 'Prescription updated',
        authorAdminId: command.adminId,
        now,
      }),
    );
    return { id: updated.id };
  }
}
