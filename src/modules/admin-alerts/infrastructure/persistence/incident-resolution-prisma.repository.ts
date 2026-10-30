import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { IncidentResolution } from '../../domain/incident-resolution.entity';
import { IncidentResolutionRepository } from '../../domain/incident-resolution.repository';
import { IncidentResolutionMapper } from './incident-resolution.mapper';

/** Prisma adapter for the IncidentResolutionRepository port. */
@Injectable()
export class IncidentResolutionPrismaRepository implements IncidentResolutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIncident(incidentId: string): Promise<IncidentResolution | null> {
    const row = await this.prisma.incidentResolution.findUnique({ where: { incidentId } });
    return row ? IncidentResolutionMapper.toDomain(row) : null;
  }

  async save(resolution: IncidentResolution): Promise<void> {
    const status = IncidentResolutionMapper.statusToPersistence(resolution.status);
    const fields = {
      status,
      summary: resolution.summary,
      actionsTaken: resolution.actionsTaken,
      followUpRequired: resolution.followUpRequired,
      followUpDate: resolution.followUpDate,
      followUpNotes: resolution.followUpNotes,
      updatedByAdminId: resolution.updatedByAdminId,
    };
    await this.prisma.incidentResolution.upsert({
      where: { incidentId: resolution.incidentId },
      create: { id: resolution.id, incidentId: resolution.incidentId, ...fields },
      update: fields,
    });
  }
}
