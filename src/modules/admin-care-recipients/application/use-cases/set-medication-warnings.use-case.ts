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
import { MedicationWarning } from '@modules/care-recipients/domain/medication-warning.entity';
import {
  MEDICATION_WARNING_REPOSITORY,
  MedicationWarningRepository,
} from '@modules/care-recipients/domain/medication-warning.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetMedicationWarningsCommand {
  recipientId: string;
  adminId: string;
  note?: string | null;
  warnings: { title: string; detail: string }[];
}

/**
 * Use case: the admin replaces a recipient's medication clinical warning profile
 * (drug interactions, food instructions). Captured as a set, replaced wholesale,
 * and the change is recorded on the prescription audit trail.
 */
@Injectable()
export class SetMedicationWarningsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(MEDICATION_WARNING_REPOSITORY) private readonly warnings: MedicationWarningRepository,
    @Inject(MEDICATION_AUDIT_REPOSITORY) private readonly audits: MedicationAuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: SetMedicationWarningsCommand): Promise<{ warningCount: number }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const warnings = command.warnings.map((warning, index) =>
      MedicationWarning.create({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        title: warning.title,
        detail: warning.detail,
        position: index,
      }),
    );
    await this.warnings.replaceForRecipient(command.recipientId, warnings);

    await this.audits.add(
      MedicationAudit.record({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        title: 'Clinical warnings updated',
        detail: command.note?.trim() || `${warnings.length} clinical warning(s) recorded`,
        authorAdminId: command.adminId,
        now: this.clock.now(),
      }),
    );
    return { warningCount: warnings.length };
  }
}
