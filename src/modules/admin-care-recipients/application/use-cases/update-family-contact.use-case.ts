import { Inject, Injectable } from '@nestjs/common';
import {
  FAMILY_CONTACT_REPOSITORY,
  FamilyContactRepository,
} from '@modules/family-contacts/domain/family-contact.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { FamilyContactDetails } from './add-family-contact.use-case';

export interface UpdateFamilyContactCommand extends FamilyContactDetails {
  recipientId: string;
  contactId: string;
}

/**
 * Use case: the admin revises a registered family contact, replacing the editable
 * details, roles, access and portal settings. The contact must belong to the recipient
 * in scope.
 */
@Injectable()
export class UpdateFamilyContactUseCase {
  constructor(
    @Inject(FAMILY_CONTACT_REPOSITORY) private readonly contacts: FamilyContactRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateFamilyContactCommand): Promise<{ id: string }> {
    const contact = await this.contacts.findById(command.contactId);
    if (contact === null || contact.careRecipientId !== command.recipientId) {
      throw new NotFoundDomainException('Family contact not found');
    }

    contact.revise({
      name: command.name,
      relationship: command.relationship,
      roles: command.roles,
      roleNote: command.roleNote,
      phone: command.phone,
      email: command.email,
      address: command.address,
      accessLevel: command.accessLevel,
      accessScopeLabel: command.accessScopeLabel,
      authorizedSectionsLabel: command.authorizedSectionsLabel,
      preferredMethod: command.preferredMethod,
      portalLoginEnabled: command.portalLoginEnabled,
      now: this.clock.now(),
    });
    await this.contacts.save(contact);
    return { id: contact.id };
  }
}
