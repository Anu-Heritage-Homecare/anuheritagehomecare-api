import { Injectable } from '@nestjs/common';
import {
  TO_DOMAIN_ACCESS_LEVEL,
  TO_DOMAIN_COMMUNICATION_TYPE,
  TO_DOMAIN_PREFERRED_METHOD,
  TO_DOMAIN_ROLE,
} from '@modules/family-contacts/infrastructure/persistence/family-enum.maps';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CommunicationRowView,
  FamilyContactRowView,
  RecipientFamilyReadModel,
} from '../../application/ports/recipient-family-read.port';

/** Prisma read model over the family contacts tables for the admin Family screen. */
@Injectable()
export class RecipientFamilyReadPrisma implements RecipientFamilyReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(recipientId: string): Promise<FamilyContactRowView[]> {
    const [contacts, latest] = await Promise.all([
      this.prisma.familyContact.findMany({
        where: { careRecipientId: recipientId },
        orderBy: { createdAt: 'asc' },
      }),
      // The latest interaction per contact: distinct on the contact, newest first.
      this.prisma.familyCommunication.findMany({
        where: { careRecipientId: recipientId },
        distinct: ['familyContactId'],
        orderBy: { occurredAt: 'desc' },
        select: { familyContactId: true, occurredAt: true, type: true },
      }),
    ]);

    const lastByContact = new Map(latest.map((row) => [row.familyContactId, row]));

    return contacts.map((contact) => {
      const last = lastByContact.get(contact.id) ?? null;
      return {
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        roles: contact.roles.map((role) => TO_DOMAIN_ROLE[role]),
        roleNote: contact.roleNote,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        accessLevel: TO_DOMAIN_ACCESS_LEVEL[contact.accessLevel],
        accessScopeLabel: contact.accessScopeLabel,
        authorizedSectionsLabel: contact.authorizedSectionsLabel,
        preferredMethod:
          contact.preferredMethod === null
            ? null
            : TO_DOMAIN_PREFERRED_METHOD[contact.preferredMethod],
        portalLoginEnabled: contact.portalLoginEnabled,
        lastContactAt: last?.occurredAt ?? null,
        lastContactType: last === null ? null : TO_DOMAIN_COMMUNICATION_TYPE[last.type],
      };
    });
  }

  async communicationLog(
    recipientId: string,
    since: Date,
    limit: number,
  ): Promise<CommunicationRowView[]> {
    const rows = await this.prisma.familyCommunication.findMany({
      where: { careRecipientId: recipientId, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: { familyContact: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      familyContactId: row.familyContactId,
      familyMemberName: row.familyContact.name,
      type: TO_DOMAIN_COMMUNICATION_TYPE[row.type],
      subject: row.subject,
      staffMemberName: row.staffMemberName,
      occurredAt: row.occurredAt,
    }));
  }
}
