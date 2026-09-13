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

export interface DiscontinueMedicationCommand {
  recipientId: string;
  medicationId: string;
  adminId: string;
  note?: string | null;
}

/**
 * Use case: the admin discontinues a prescription. The medication is kept (marked
 * discontinued, not deleted) so its administration history and adherence record
 * survive, and the change is recorded on the audit trail.
 */
@Injectable()
export class DiscontinueMedicationUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(MEDICATION_AUDIT_REPOSITORY) private readonly audits: MedicationAuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: DiscontinueMedicationCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    const existing = recipient.findMedication(command.medicationId);
    if (existing === null) {
      throw new NotFoundDomainException('Medication not found');
    }

    const now = this.clock.now();
    const discontinued = existing.discontinuedCopy(now);
    recipient.replaceMedication(discontinued, now);
    await this.recipients.save(recipient);

    await this.audits.add(
      MedicationAudit.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        title: `${discontinued.name} discontinued`,
        detail: command.note?.trim() || 'Prescription discontinued',
        authorAdminId: command.adminId,
        now,
      }),
    );
    return { id: discontinued.id };
  }
}
