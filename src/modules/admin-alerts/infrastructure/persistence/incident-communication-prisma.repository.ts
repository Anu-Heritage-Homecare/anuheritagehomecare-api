import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { IncidentCommunication } from '../../domain/incident-communication.entity';
import { IncidentCommunicationRepository } from '../../domain/incident-communication.repository';
import { IncidentCommunicationMapper } from './incident-communication.mapper';

/** Prisma adapter for the IncidentCommunicationRepository port. */
@Injectable()
export class IncidentCommunicationPrismaRepository implements IncidentCommunicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForIncident(incidentId: string): Promise<IncidentCommunication[]> {
    const rows = await this.prisma.incidentCommunication.findMany({
      where: { incidentId },
      orderBy: { at: 'asc' },
    });
    return rows.map((row) => IncidentCommunicationMapper.toDomain(row));
  }

  async record(communication: IncidentCommunication): Promise<void> {
    await this.prisma.incidentCommunication.create({
      data: {
        id: communication.id,
        incidentId: communication.incidentId,
        at: communication.at,
        channel: IncidentCommunicationMapper.channelToPersistence(communication.channel),
        outcome: IncidentCommunicationMapper.outcomeToPersistence(communication.outcome),
        contactName: communication.contactName,
        contactRole: communication.contactRole,
        notes: communication.notes,
        authorAdminId: communication.authorAdminId,
      },
    });
  }
}
