import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { IncidentTimelineEvent } from '../../domain/incident-timeline-event.entity';
import { IncidentTimelineRepository } from '../../domain/incident-timeline.repository';
import { IncidentTimelineMapper } from './incident-timeline.mapper';

/** Prisma adapter for the IncidentTimelineRepository port. */
@Injectable()
export class IncidentTimelinePrismaRepository implements IncidentTimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForIncident(incidentId: string): Promise<IncidentTimelineEvent[]> {
    const rows = await this.prisma.incidentTimelineEvent.findMany({
      where: { incidentId },
      orderBy: { at: 'asc' },
    });
    return rows.map((row) => IncidentTimelineMapper.toDomain(row));
  }

  async append(event: IncidentTimelineEvent): Promise<void> {
    await this.prisma.incidentTimelineEvent.create({
      data: {
        id: event.id,
        incidentId: event.incidentId,
        at: event.at,
        kind: IncidentTimelineMapper.kindToPersistence(event.kind),
        title: event.title,
        description: event.description,
        actorName: event.actorName,
        actorRole: event.actorRole,
        authorAdminId: event.authorAdminId,
      },
    });
  }
}
