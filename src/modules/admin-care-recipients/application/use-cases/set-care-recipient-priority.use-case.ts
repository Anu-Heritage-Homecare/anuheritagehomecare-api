import { Inject, Injectable } from '@nestjs/common';
import { CareRecipientPriority } from '@modules/care-recipients/domain/care-recipient-priority.enum';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface SetCareRecipientPriorityCommand {
  recipientId: string;
  priority: CareRecipientPriority;
}

/** Use case: set the office priority used to triage a recipient on the admin list. */
@Injectable()
export class SetCareRecipientPriorityUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    command: SetCareRecipientPriorityCommand,
  ): Promise<{ id: string; priority: string }> {
    const recipient = await this.recipients.findById(command.recipientId);
    if (recipient === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }
    recipient.setPriority(command.priority, this.clock.now());
    await this.recipients.save(recipient);
    return { id: recipient.id, priority: String(recipient.priority) };
  }
}
