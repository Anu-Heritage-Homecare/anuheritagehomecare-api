import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_CONTACT_REPOSITORY,
  FamilyContactRepository,
} from '@modules/family-contacts/domain/family-contact.repository';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface RemoveFamilyContactCommand {
  recipientId: string;
  contactId: string;
}

/**
 * Use case: the admin removes a registered family contact. Their logged communications
 * cascade with them. The contact must belong to the recipient in scope.
 */
@Injectable()
export class RemoveFamilyContactUseCase {
  constructor(
    @Inject(FAMILY_CONTACT_REPOSITORY) private readonly contacts: FamilyContactRepository,
  ) {}

  async execute(command: RemoveFamilyContactCommand): Promise<{ id: string }> {
    const contact = await this.contacts.findById(command.contactId);
    if (contact === null || contact.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Family contact not found');
    }
    await this.contacts.remove(contact.id);
    return { id: contact.id };
  }
}
