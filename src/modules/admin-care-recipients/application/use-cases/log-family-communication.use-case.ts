import { Inject, Injectable } from '@nestjs/common';
import { FamilyCommunication } from '@modules/family-contacts/domain/family-communication.entity';
import { FamilyCommunicationType } from '@modules/family-contacts/domain/family-communication-type.enum';
import {
  FAMILY_COMMUNICATION_REPOSITORY,
  FamilyCommunicationRepository,
} from '@modules/family-contacts/domain/family-communication.repository';
import {
  FAMILY_CONTACT_REPOSITORY,
  FamilyContactRepository,
} from '@modules/family-contacts/domain/family-contact.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface LogFamilyCommunicationCommand {
  recipientId: string;
  contactId: string;
  type: FamilyCommunicationType;
  subject: string;
  staffMemberName: string;
  occurredAt: Date;
}

/**
 * Use case: the admin logs an interaction with a family contact (an app message, phone
 * call, in person visit, email or video call). Feeds the communication log and the last
 * contact on the contact card. The contact must belong to the recipient in scope.
 */
@Injectable()
export class LogFamilyCommunicationUseCase {
  constructor(
    @Inject(FAMILY_CONTACT_REPOSITORY) private readonly contacts: FamilyContactRepository,
    @Inject(FAMILY_COMMUNICATION_REPOSITORY)
    private readonly communications: FamilyCommunicationRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: LogFamilyCommunicationCommand): Promise<{ id: string }> {
    const contact = await this.contacts.findById(command.contactId);
    if (contact === null || contact.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Family contact not found');
    }

    const communication = FamilyCommunication.record({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
      familyContactId: contact.id,
      type: command.type,
      subject: command.subject,
      staffMemberName: command.staffMemberName,
      occurredAt: command.occurredAt,
      now: this.clock.now(),
    });
    await this.communications.add(communication);
    return { id: communication.id };
  }
}
