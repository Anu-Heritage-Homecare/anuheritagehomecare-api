import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '@modules/care-recipients/domain/care-recipient.repository';
import { FamilyContactRole } from '@modules/family-contacts/domain/family-contact-role.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import {
  FamilyContactRowView,
  RECIPIENT_FAMILY_READ_MODEL,
  RecipientFamilyReadModel,
} from '../ports/recipient-family-read.port';
import {
  FamilyContactItemResult,
  FamilySummaryContactResult,
  RecipientFamilyResult,
} from '../dto/recipient-family.result';

const MS_PER_DAY = 86_400_000;
const COMMUNICATION_WINDOW_DAYS = 30;
const COMMUNICATION_LOG_LIMIT = 20;

/**
 * Use case: assemble one recipient's Family tab. Composes the summary cards (primary,
 * emergency and power of attorney contacts, and the member count), the registered
 * contact cards (each with its derived last contact and tier badge), the recent
 * communication log and the care portal permissions matrix. The summary and the matrix
 * are projected from the contacts, so no extra query is needed.
 */
@Injectable()
export class GetRecipientFamilyUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY) private readonly recipients: CareRecipientRepository,
    @Inject(RECIPIENT_FAMILY_READ_MODEL) private readonly readModel: RecipientFamilyReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(recipientId: string): Promise<RecipientFamilyResult> {
    if ((await this.recipients.findById(recipientId)) === null) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const since = new Date(this.clock.now().getTime() - COMMUNICATION_WINDOW_DAYS * MS_PER_DAY);
    const [contacts, log] = await Promise.all([
      this.readModel.listContacts(recipientId),
      this.readModel.communicationLog(recipientId, since, COMMUNICATION_LOG_LIMIT),
    ]);

    return {
      summary: {
        primaryContact: this.summaryFor(contacts, FamilyContactRole.PrimaryContact),
        emergencyContact: this.summaryFor(contacts, FamilyContactRole.EmergencyContact),
        powerOfAttorney: this.summaryFor(contacts, FamilyContactRole.PowerOfAttorney),
        totalMembers: contacts.length,
      },
      contacts: contacts.map((contact) => this.toContact(contact)),
      communicationLog: log.map((row) => ({
        id: row.id,
        familyMemberName: row.familyMemberName,
        type: String(row.type),
        subject: row.subject,
        staffMemberName: row.staffMemberName,
        occurredAt: row.occurredAt,
      })),
      permissionsMatrix: contacts.map((contact) => ({
        familyMemberName: contact.name,
        accessLevel: String(contact.accessLevel),
        authorizedSectionsLabel: contact.authorizedSectionsLabel,
        portalLoginEnabled: contact.portalLoginEnabled,
      })),
    };
  }

  private summaryFor(
    contacts: FamilyContactRowView[],
    role: FamilyContactRole,
  ): FamilySummaryContactResult {
    const match = contacts.find((contact) => contact.roles.includes(role)) ?? null;
    return {
      name: match?.name ?? null,
      relationship: match?.relationship ?? null,
    };
  }

  private toContact(contact: FamilyContactRowView): FamilyContactItemResult {
    return {
      id: contact.id,
      name: contact.name,
      relationship: contact.relationship,
      tier: this.tierFor(contact),
      roles: contact.roles.map((role) => String(role)),
      roleNote: contact.roleNote,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      accessLevel: String(contact.accessLevel),
      accessScopeLabel: contact.accessScopeLabel,
      preferredMethod: contact.preferredMethod === null ? null : String(contact.preferredMethod),
      lastContactAt: contact.lastContactAt,
      lastContactType: contact.lastContactType === null ? null : String(contact.lastContactType),
    };
  }

  /** The tier badge shown next to the name: primary takes precedence over secondary. */
  private tierFor(contact: FamilyContactRowView): string | null {
    if (contact.roles.includes(FamilyContactRole.PrimaryContact)) {
      return String(FamilyContactRole.PrimaryContact);
    }
    if (contact.roles.includes(FamilyContactRole.SecondaryContact)) {
      return String(FamilyContactRole.SecondaryContact);
    }
    return null;
  }
}
