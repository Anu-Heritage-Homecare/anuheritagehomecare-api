import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

/** The lifecycle transitions a coordinator drives from the row actions. */
export type CareRecipientStatusAction = 'HOLD' | 'DISCHARGE' | 'REACTIVATE';

export interface ChangeCareRecipientStatusCommand {
  recipientId: string;
  action: CareRecipientStatusAction;
}

export interface CareRecipientActionResult {
  id: string;
  status: string;
}

/**
 * Use case: move a care recipient through the office lifecycle: place on hold,
 * discharge, or reactivate. Illegal transitions are rejected by the aggregate.
 */
@Injectable()
export class ChangeCareRecipientStatusUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ChangeCareRecipientStatusCommand): Promise<CareRecipientActionResult> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const now = this.clock.now();
    switch (command.action) {
      case 'HOLD':
        recipient.placeOnHold(now);
        break;
      case 'DISCHARGE':
        recipient.discharge(now);
        break;
      case 'REACTIVATE':
        recipient.reactivate(now);
        break;
    }

    await this.recipients.save(recipient);
    return { id: recipient.id, status: String(recipient.status) };
  }
}
