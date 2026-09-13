import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { FamilyAccessLevel } from '@modules/family-contacts/domain/family-access-level.enum';
import { FamilyContactRole } from '@modules/family-contacts/domain/family-contact-role.enum';
import { FamilyContact } from '@modules/family-contacts/domain/family-contact.entity';
import {
  FAMILY_CONTACT_REPOSITORY,
  FamilyContactRepository,
} from '@modules/family-contacts/domain/family-contact.repository';
import { FamilyPreferredContactMethod } from '@modules/family-contacts/domain/family-preferred-contact-method.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export interface FamilyContactDetails {
  name: string;
  relationship: string;
  roles?: FamilyContactRole[] | null;
  roleNote?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  accessLevel?: FamilyAccessLevel;
  accessScopeLabel?: string | null;
  authorizedSectionsLabel?: string | null;
  preferredMethod?: FamilyPreferredContactMethod | null;
  portalLoginEnabled?: boolean;
}

export interface AddFamilyContactCommand extends FamilyContactDetails {
  recipientId: string;
}

/**
 * Use case: the admin registers a family contact against a care recipient, capturing
 * their details, designated roles, portal access level and preferred contact channel.
 */
@Injectable()
export class AddFamilyContactUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(FAMILY_CONTACT_REPOSITORY) private readonly contacts: FamilyContactRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async execute(command: AddFamilyContactCommand): Promise<{ id: string }> {
    if ((await this.recipients.findById(command.recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const contact = FamilyContact.register({
      id: this.ids.generate(),
      careRecipientId: command.recipientId,
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
    await this.contacts.add(contact);
    return { id: contact.id };
  }
}
