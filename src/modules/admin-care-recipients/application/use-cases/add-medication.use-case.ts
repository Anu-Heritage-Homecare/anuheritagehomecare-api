import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { Medication } from '@modules/care-recipients/domain/medication.entity';
import { MedicationAudit } from '@modules/care-recipients/domain/medication-audit.entity';
import {
  MEDICATION_AUDIT_REPOSITORY,
  MedicationAuditRepository,
} from '@modules/care-recipients/domain/medication-audit.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AddMedicationCommand {
  recipientId: string;
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
 * Use case: the admin adds a prescription to a care recipient. The medication is
 * appended to the aggregate and the change is recorded on the prescription audit
 * trail, attributed to the admin.
 */
@Injectable()
export class AddMedicationUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(MEDICATION_AUDIT_REPOSITORY) private readonly audits: MedicationAuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddMedicationCommand): Promise<{ id: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const medication = Medication.create({
      id: this.ids.generate(),
      name: command.name,
      dose: command.dose,
      purpose: command.purpose,
      prescribedBy: command.prescribedBy,
      startDate: command.startDate,
      instructions: command.instructions,
      doseTimes: command.doseTimes,
    });
    recipient.addMedication(medication, now);
    await this.recipients.save(recipient);

    await this.audits.add(
      MedicationAudit.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        title: `${label(medication)} added`,
        detail: command.note?.trim() || 'Prescription added',
        authorAdminId: command.adminId,
        now,
      }),
    );
    return { id: medication.id };
  }
}

/** For example "Donepezil 10mg" or "Donepezil" when no dose is recorded. */
function label(medication: Medication): string {
  return medication.dose === null ? medication.name : `${medication.name} ${medication.dose}`;
}
