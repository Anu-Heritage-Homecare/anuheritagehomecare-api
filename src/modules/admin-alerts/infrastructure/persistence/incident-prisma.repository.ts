import { Injectable } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Incident } from '../../domain/incident.entity';
import { IncidentRepository } from '../../domain/incident.repository';
import { IncidentMapper } from './incident.mapper';

/** Prisma backed adapter for the IncidentRepository port. */
@Injectable()
export class IncidentPrismaRepository implements IncidentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(incident: Incident): Promise<Incident> {
    const row = await this.prisma.incident.create({
      data: IncidentMapper.toCreateInput(incident),
    });
    return IncidentMapper.toDomain(row);
  }

  async save(incident: Incident): Promise<void> {
    const row = IncidentMapper.toCreateInput(incident);
    await this.prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: row.status,
        severity: row.severity,
        assignedCoordinatorAdminId: incident.assignedCoordinatorAdminId,
        resolvedAt: incident.resolvedAt,
        resolvedByAdminId: incident.resolvedByAdminId,
      },
    });
  }

  async findById(id: string): Promise<Incident | null> {
    const row = await this.prisma.incident.findUnique({ where: { id } });
    return row ? IncidentMapper.toDomain(row) : null;
  }

  async listForOverview(resolvedSince: Date, limit: number): Promise<Incident[]> {
    const rows = await this.prisma.incident.findMany({
      where: {
        OR: [
          { status: IncidentStatus.OPEN },
          {
            status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
            resolvedAt: { gte: resolvedSince },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => IncidentMapper.toDomain(row));
  }

  async listResolvedSince(since: Date, limit: number): Promise<Incident[]> {
    const rows = await this.prisma.incident.findMany({
      where: {
        status: { in: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
        resolvedAt: { gte: since },
      },
      orderBy: { resolvedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => IncidentMapper.toDomain(row));
  }
}
