import { Module } from '@nestjs/common';
import { FAMILY_COMMUNICATION_REPOSITORY } from './domain/family-communication.repository';
import { FAMILY_CONTACT_REPOSITORY } from './domain/family-contact.repository';
import { FamilyCommunicationPrismaRepository } from './infrastructure/persistence/family-communication-prisma.repository';
import { FamilyContactPrismaRepository } from './infrastructure/persistence/family-contact-prisma.repository';

/**
 * Family contacts bounded context composition root. Owns the family contact and
 * communication write side; the admin Family read model composes these tables. The
 * domain ports are bound to their Prisma adapters here and exported so the admin layer
 * depends only on the abstractions.
 */
@Module({
  providers: [
    { provide: FAMILY_CONTACT_REPOSITORY, useClass: FamilyContactPrismaRepository },
    { provide: FAMILY_COMMUNICATION_REPOSITORY, useClass: FamilyCommunicationPrismaRepository },
  ],
  exports: [FAMILY_CONTACT_REPOSITORY, FAMILY_COMMUNICATION_REPOSITORY],
})
export class FamilyContactsModule {}
