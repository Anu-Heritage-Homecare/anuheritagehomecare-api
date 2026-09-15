import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { DischargeAcknowledgement } from '@modules/care-recipients/domain/discharge-acknowledgement.enum';
import { DischargeAction } from '@modules/care-recipients/domain/discharge-action.enum';
import { DischargeReason } from '@modules/care-recipients/domain/discharge-reason.enum';
import { DischargeRecord } from '@modules/care-recipients/domain/discharge-record.entity';
import {
  DISCHARGE_RECORD_REPOSITORY,
  DischargeRecordRepository,
} from '@modules/care-recipients/domain/discharge-record.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface DischargeFormCommand {
  recipientId: string;
  action: DischargeAction;
  reason?: DischargeReason | null;
  effectiveDate?: Date | null;
  clinicalSummary?: string | null;
  acknowledgements?: DischargeAcknowledgement[] | null;
}

/**
 * Use case: save (or revise) the archive/discharge form as a draft, so a coordinator
 * can complete it over time. Upserted (one record per recipient); a record that has
 * already been processed cannot be edited.
 */
@Injectable()
export class SaveDischargeDraftUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(DISCHARGE_RECORD_REPOSITORY) private readonly records: DischargeRecordRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: DischargeFormCommand): Promise<{ id: string; status: string }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    const fields = {
      action: command.action,
      reason: command.reason,
      effectiveDate: command.effectiveDate,
      clinicalSummary: command.clinicalSummary,
      acknowledgements: command.acknowledgements,
    };

    const existing = await this.records.findByRecipient(command.recipientId);
    if (existing === null) {
      const record = DischargeRecord.draft({
        id: this.ids.generate(),
        careRecipientId: command.recipientId,
        fields,
        now,
      });
      await this.records.add(record);
      return { id: record.id, status: String(record.status) };
    }

    existing.revise(fields, now);
    await this.records.save(existing);
    return { id: existing.id, status: String(existing.status) };
  }
}
