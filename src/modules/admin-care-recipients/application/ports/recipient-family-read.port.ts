import { FamilyAccessLevel } from '@modules/family-contacts/domain/family-access-level.enum';
import { FamilyCommunicationType } from '@modules/family-contacts/domain/family-communication-type.enum';
import { FamilyContactRole } from '@modules/family-contacts/domain/family-contact-role.enum';
import { FamilyPreferredContactMethod } from '@modules/family-contacts/domain/family-preferred-contact-method.enum';

export interface FamilyContactRowView {
  id: string;
  name: string;
  relationship: string;
  roles: FamilyContactRole[];
  roleNote: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  accessLevel: FamilyAccessLevel;
  accessScopeLabel: string | null;
  authorizedSectionsLabel: string | null;
  preferredMethod: FamilyPreferredContactMethod | null;
  portalLoginEnabled: boolean;
  /** The most recent logged interaction with this contact, derived, or null. */
  lastContactAt: Date | null;
  lastContactType: FamilyCommunicationType | null;
}

export interface CommunicationRowView {
  id: string;
  familyContactId: string;
  familyMemberName: string;
  type: FamilyCommunicationType;
  subject: string;
  staffMemberName: string;
  occurredAt: Date;
}

/**
 * Read model for the admin Family screen. Composes the registered contacts (each with
 * its derived last contact) and the recent communication log. The summary cards and the
 * permissions matrix are projected from the contacts in the use case.
 */
export interface RecipientFamilyReadModel {
  listContacts(recipientId: string): Promise<FamilyContactRowView[]>;
  communicationLog(
    recipientId: string,
    since: Date,
    limit: number,
  ): Promise<CommunicationRowView[]>;
}

export const RECIPIENT_FAMILY_READ_MODEL = Symbol('RECIPIENT_FAMILY_READ_MODEL');
