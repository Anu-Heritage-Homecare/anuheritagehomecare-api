import { Injectable } from '@nestjs/common';
import {
  Prisma,
  VisitStatus as PrismaVisitStatus,
  VisitType as PrismaVisitType,
} from '@prisma/client';
import { VisitStatus } from '@modules/visits/domain/visit-status.enum';
import { VisitType } from '@modules/visits/domain/visit-type.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CaregiverVisitCountView,
  RecipientVisitRowView,
  RecipientVisitsFilter,
  RecipientVisitsPageView,
  RecipientVisitsReadModel,
  RecipientVisitsStatsView,
  VisitTypeCountView,
} from '../../application/ports/recipient-visits-read.port';

const TO_PRISMA_STATUS: Record<VisitStatus, PrismaVisitStatus> = {
  [VisitStatus.Scheduled]: PrismaVisitStatus.SCHEDULED,
  [VisitStatus.InProgress]: PrismaVisitStatus.IN_PROGRESS,
  [VisitStatus.OnBreak]: PrismaVisitStatus.ON_BREAK,
  [VisitStatus.Completed]: PrismaVisitStatus.COMPLETED,
  [VisitStatus.Cancelled]: PrismaVisitStatus.CANCELLED,
  [VisitStatus.Missed]: PrismaVisitStatus.MISSED,
};

const TO_DOMAIN_STATUS: Record<PrismaVisitStatus, VisitStatus> = {
  SCHEDULED: VisitStatus.Scheduled,
  IN_PROGRESS: VisitStatus.InProgress,
  ON_BREAK: VisitStatus.OnBreak,
  COMPLETED: VisitStatus.Completed,
  CANCELLED: VisitStatus.Cancelled,
  MISSED: VisitStatus.Missed,
};

const TO_PRISMA_TYPE: Record<VisitType, PrismaVisitType> = {
  [VisitType.PersonalCare]: PrismaVisitType.PERSONAL_CARE,
  [VisitType.MorningCare]: PrismaVisitType.MORNING_CARE,
  [VisitType.Medication]: PrismaVisitType.MEDICATION,
  [VisitType.PhysicalTherapy]: PrismaVisitType.PHYSICAL_THERAPY,
  [VisitType.WoundCare]: PrismaVisitType.WOUND_CARE,
  [VisitType.Companionship]: PrismaVisitType.COMPANIONSHIP,
};

const TO_DOMAIN_TYPE: Record<PrismaVisitType, VisitType> = {
  PERSONAL_CARE: VisitType.PersonalCare,
  MORNING_CARE: VisitType.MorningCare,
  MEDICATION: VisitType.Medication,
  PHYSICAL_THERAPY: VisitType.PhysicalTherapy,
  WOUND_CARE: VisitType.WoundCare,
  COMPANIONSHIP: VisitType.Companionship,
};

/**
 * Prisma read model for one recipient's Visits tab. Owns the filtered, paginated
 * table query and the aggregate figures behind the summary cards and analytics.
 * Every query is scoped to the recipient and pushes counting and averaging into the
 * database (no loading the full history into memory).
 */
@Injectable()
export class RecipientVisitsReadPrisma implements RecipientVisitsReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async listPage(filter: RecipientVisitsFilter): Promise<RecipientVisitsPageView> {
    const where = this.whereForFilter(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.visit.count({ where }),
      this.prisma.visit.findMany({
        where,
        orderBy: [{ scheduledDate: 'desc' }, { startMinute: 'desc' }],
        skip: Math.max(0, (filter.page - 1) * filter.pageSize),
        take: filter.pageSize,
        select: {
          id: true,
          caregiverId: true,
          scheduledDate: true,
          startMinute: true,
          endMinute: true,
          visitType: true,
          status: true,
          clockInAt: true,
          clockOutAt: true,
        },
      }),
    ]);
    return { total, rows: rows.map((row) => this.toRow(row)) };
  }

  async stats(
    recipientId: string,
    monthStart: Date,
    trendFrom: Date,
  ): Promise<RecipientVisitsStatsView> {
    const scoped: Prisma.VisitWhereInput = { careRecipientId: recipientId };
    const [
      totalVisits,
      completedVisits,
      thisMonthVisits,
      durationAgg,
      typeGroups,
      caregiverGroups,
      trendRows,
    ] = await Promise.all([
      this.prisma.visit.count({ where: scoped }),
      this.prisma.visit.count({
        where: { ...scoped, status: PrismaVisitStatus.COMPLETED },
      }),
      this.prisma.visit.count({
        where: { ...scoped, scheduledDate: { gte: monthStart } },
      }),
      this.prisma.visit.aggregate({
        where: scoped,
        _avg: { startMinute: true, endMinute: true },
      }),
      this.prisma.visit.groupBy({
        by: ['visitType'],
        where: scoped,
        _count: { _all: true },
        orderBy: { visitType: 'asc' },
      }),
      this.prisma.visit.groupBy({
        by: ['caregiverId'],
        where: { ...scoped, caregiverId: { not: null } },
        _count: { _all: true },
        orderBy: { caregiverId: 'asc' },
      }),
      this.prisma.visit.findMany({
        where: { ...scoped, scheduledDate: { gte: trendFrom } },
        select: { scheduledDate: true },
        orderBy: { scheduledDate: 'asc' },
      }),
    ]);

    const avgStart = durationAgg._avg.startMinute ?? 0;
    const avgEnd = durationAgg._avg.endMinute ?? 0;
    const avgDurationMinutes = Math.max(0, Math.round(avgEnd - avgStart));

    const typeCounts: VisitTypeCountView[] = typeGroups.map((group) => ({
      visitType: TO_DOMAIN_TYPE[group.visitType],
      count: group._count._all,
    }));
    const caregiverCounts: CaregiverVisitCountView[] = caregiverGroups
      .filter(
        (group): group is typeof group & { caregiverId: string } => group.caregiverId !== null,
      )
      .map((group) => ({ caregiverId: group.caregiverId, count: group._count._all }));

    return {
      totalVisits,
      completedVisits,
      thisMonthVisits,
      avgDurationMinutes,
      typeCounts,
      caregiverCounts,
      trendDates: trendRows.map((row) => row.scheduledDate),
    };
  }

  private whereForFilter(filter: RecipientVisitsFilter): Prisma.VisitWhereInput {
    const where: Prisma.VisitWhereInput = { careRecipientId: filter.recipientId };

    if (filter.from !== null || filter.to !== null) {
      where.scheduledDate = {
        ...(filter.from !== null ? { gte: filter.from } : {}),
        ...(filter.to !== null ? { lte: filter.to } : {}),
      };
    }
    if (filter.caregiverId !== null) {
      where.caregiverId = filter.caregiverId;
    }
    if (filter.visitType !== null) {
      where.visitType = TO_PRISMA_TYPE[filter.visitType];
    }
    if (filter.status !== null) {
      where.status = TO_PRISMA_STATUS[filter.status];
    }
    const search = filter.search?.trim();
    if (search) {
      where.notes = { some: { text: { contains: search, mode: 'insensitive' } } };
    }
    return where;
  }

  private toRow(row: {
    id: string;
    caregiverId: string | null;
    scheduledDate: Date;
    startMinute: number;
    endMinute: number;
    visitType: PrismaVisitType;
    status: PrismaVisitStatus;
    clockInAt: Date | null;
    clockOutAt: Date | null;
  }): RecipientVisitRowView {
    return {
      id: row.id,
      caregiverId: row.caregiverId,
      scheduledDate: row.scheduledDate,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      visitType: TO_DOMAIN_TYPE[row.visitType],
      status: TO_DOMAIN_STATUS[row.status],
      clockInAt: row.clockInAt,
      clockOutAt: row.clockOutAt,
    };
  }
}
