import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { FamilyCommunication } from '../../domain/family-communication.entity';
import { FamilyCommunicationRepository } from '../../domain/family-communication.repository';
import { TO_PERSISTENCE_COMMUNICATION_TYPE } from './family-enum.maps';

/** Prisma backed adapter for the FamilyCommunicationRepository port (append only). */
@Injectable()
export class FamilyCommunicationPrismaRepository implements FamilyCommunicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(communication: FamilyCommunication): Promise<void> {
    await this.prisma.familyCommunication.create({
      data: {
        id: communication.id,
        careRecipientId: communication.careRecipientId,
        familyContactId: communication.familyContactId,
        type: TO_PERSISTENCE_COMMUNICATION_TYPE[communication.type],
        subject: communication.subject,
        staffMemberName: communication.staffMemberName,
        occurredAt: communication.occurredAt,
        createdAt: communication.createdAt,
      },
    });
  }
}
