import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { FamilyContact } from '../../domain/family-contact.entity';
import { FamilyContactRepository } from '../../domain/family-contact.repository';
import {
  TO_DOMAIN_ACCESS_LEVEL,
  TO_DOMAIN_PREFERRED_METHOD,
  TO_DOMAIN_ROLE,
  TO_PERSISTENCE_ACCESS_LEVEL,
  TO_PERSISTENCE_PREFERRED_METHOD,
  TO_PERSISTENCE_ROLE,
} from './family-enum.maps';

/** Prisma backed adapter for the FamilyContactRepository port. */
@Injectable()
export class FamilyContactPrismaRepository implements FamilyContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(contact: FamilyContact): Promise<void> {
    await this.prisma.familyContact.create({ data: this.toData(contact) });
  }

  async save(contact: FamilyContact): Promise<void> {
    const { id, careRecipientId, createdAt, ...data } = this.toData(contact);
    void id;
    void careRecipientId;
    void createdAt;
    await this.prisma.familyContact.update({ where: { id: contact.id }, data });
  }

  async findById(id: string): Promise<FamilyContact | null> {
    const row = await this.prisma.familyContact.findUnique({ where: { id } });
    if (row === null) {
      return null;
    }
    return FamilyContact.rehydrate(row.id, {
      careRecipientId: row.careRecipientId,
      name: row.name,
      relationship: row.relationship,
      roles: row.roles.map((role) => TO_DOMAIN_ROLE[role]),
      roleNote: row.roleNote,
      phone: row.phone,
      email: row.email,
      address: row.address,
      accessLevel: TO_DOMAIN_ACCESS_LEVEL[row.accessLevel],
      accessScopeLabel: row.accessScopeLabel,
      authorizedSectionsLabel: row.authorizedSectionsLabel,
      preferredMethod:
        row.preferredMethod === null ? null : TO_DOMAIN_PREFERRED_METHOD[row.preferredMethod],
      portalLoginEnabled: row.portalLoginEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.familyContact.delete({ where: { id } });
  }

  private toData(contact: FamilyContact): Prisma.FamilyContactUncheckedCreateInput {
    return {
      id: contact.id,
      careRecipientId: contact.careRecipientId,
      name: contact.name,
      relationship: contact.relationship,
      roles: contact.roles.map((role) => TO_PERSISTENCE_ROLE[role]),
      roleNote: contact.roleNote,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      accessLevel: TO_PERSISTENCE_ACCESS_LEVEL[contact.accessLevel],
      accessScopeLabel: contact.accessScopeLabel,
      authorizedSectionsLabel: contact.authorizedSectionsLabel,
      preferredMethod:
        contact.preferredMethod === null
          ? null
          : TO_PERSISTENCE_PREFERRED_METHOD[contact.preferredMethod],
      portalLoginEnabled: contact.portalLoginEnabled,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
