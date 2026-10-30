import { Injectable } from '@nestjs/common';
import { AlertStatus, AlertType } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { OperationalAlert } from '../../domain/operational-alert.entity';
import { OperationalAlertRepository } from '../../domain/operational-alert.repository';
import { OperationalAlertMapper } from './operational-alert.mapper';

/** Prisma backed adapter for the OperationalAlertRepository port. */
@Injectable()
export class OperationalAlertPrismaRepository implements OperationalAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(alert: OperationalAlert): Promise<void> {
    const row = OperationalAlertMapper.toPersistence(alert);
    await this.prisma.operationalAlert.upsert({
      where: { id: row.id },
      create: row,
      update: {
        status: row.status,
        acknowledgedAt: row.acknowledgedAt,
        acknowledgedByAdminId: row.acknowledgedByAdminId,
        acknowledgeNote: row.acknowledgeNote,
        escalatedAt: row.escalatedAt,
        escalatedByAdminId: row.escalatedByAdminId,
        escalationLevel: row.escalationLevel,
        escalationAssignee: row.escalationAssignee,
        escalationReason: row.escalationReason,
        escalationNote: row.escalationNote,
        resolvedAt: row.resolvedAt,
        resolvedByAdminId: row.resolvedByAdminId,
        resolutionCategory: row.resolutionCategory,
        resolutionActionTaken: row.resolutionActionTaken,
        resolutionInternalNote: row.resolutionInternalNote,
      },
    });
  }

  async findById(id: string): Promise<OperationalAlert | null> {
    const row = await this.prisma.operationalAlert.findUnique({ where: { id } });
    return row ? OperationalAlertMapper.toDomain(row) : null;
  }

  async listForOverview(resolvedSince: Date, limit: number): Promise<OperationalAlert[]> {
    const rows = await this.prisma.operationalAlert.findMany({
      where: {
        OR: [
          {
            status: {
              in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.INVESTIGATING],
            },
          },
          {
            status: { in: [AlertStatus.RESOLVED, AlertStatus.DISMISSED] },
            resolvedAt: { gte: resolvedSince },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => OperationalAlertMapper.toDomain(row));
  }

  async listResolvedSince(since: Date, limit: number): Promise<OperationalAlert[]> {
    const rows = await this.prisma.operationalAlert.findMany({
      where: {
        status: { in: [AlertStatus.RESOLVED, AlertStatus.DISMISSED] },
        resolvedAt: { gte: since },
      },
      orderBy: { resolvedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => OperationalAlertMapper.toDomain(row));
  }

  async listOpen(limit: number): Promise<OperationalAlert[]> {
    const rows = await this.prisma.operationalAlert.findMany({
      where: { status: AlertStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => OperationalAlertMapper.toDomain(row));
  }

  async countOpen(): Promise<number> {
    return this.prisma.operationalAlert.count({ where: { status: AlertStatus.OPEN } });
  }

  async existsOpenForVisit(type: string, visitId: string): Promise<boolean> {
    const count = await this.prisma.operationalAlert.count({
      where: { status: AlertStatus.OPEN, type: type as AlertType, relatedVisitId: visitId },
    });
    return count > 0;
  }

  async existsOpenForCaregiver(type: string, caregiverId: string): Promise<boolean> {
    const count = await this.prisma.operationalAlert.count({
      where: { status: AlertStatus.OPEN, type: type as AlertType, relatedCaregiverId: caregiverId },
    });
    return count > 0;
  }
}
