import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { HealthEvent } from '@modules/care-recipients/domain/health-event.entity';
import { HealthEventCategory } from '@modules/care-recipients/domain/health-event-category.enum';
import {
  HEALTH_EVENT_REPOSITORY,
  HealthEventRepository,
} from '@modules/care-recipients/domain/health-event.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface AddHealthEventCommand {
  recipientId: string;
  adminId: string;
  category: HealthEventCategory;
  title: string;
  description: string;
  recordedByName?: string | null;
  recordedByRole?: string | null;
  occurredAt: Date;
}

/**
 * Use case: the admin records a health event on a care recipient's timeline (a
 * vitals summary, alert, medication change, incident, assessment, appointment or
 * care note). Append only, attributed to the admin who entered it.
 */
@Injectable()
export class AddHealthEventUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(HEALTH_EVENT_REPOSITORY) private readonly events: HealthEventRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddHealthEventCommand): Promise<{ id: string }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const event = HealthEvent.record({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      category: command.category,
      title: command.title,
      description: command.description,
      recordedByName: command.recordedByName,
      recordedByRole: command.recordedByRole,
      occurredAt: command.occurredAt,
      authorAdminId: command.adminId,
      now: this.clock.now(),
    });
    await this.events.add(event);
    return { id: event.id };
  }
}
