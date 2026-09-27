import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  SchedulingDayView,
  SchedulingReadModel,
  SchedulingVisitRow,
} from '../../application/ports/scheduling-read.port';

const VISIT_SELECT = {
  id: true,
  scheduledDate: true,
  startMinute: true,
  endMinute: true,
  visitType: true,
  priority: true,
  status: true,
  caregiverId: true,
  careRecipientId: true,
} as const;

interface VisitRow {
  id: string;
  scheduledDate: Date;
  startMinute: number;
  endMinute: number;
  visitType: string;
  priority: string;
  status: string;
  caregiverId: string | null;
  careRecipientId: string;
}

/**
 * Prisma read model for the Scheduling console. Loads the day's (or range's) visits
 * and batches the recipient and caregiver name lookups into a single query each.
 */
@Injectable()
export class SchedulingReadPrisma implements SchedulingReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async day(dayStart: Date, nextDay: Date): Promise<SchedulingDayView> {
    const [rows, activeCaregivers] = await Promise.all([
      this.prisma.visit.findMany({
        where: { scheduledDate: { gte: dayStart, lt: nextDay } },
        select: VISIT_SELECT,
        orderBy: [{ startMinute: 'asc' }, { scheduledDate: 'asc' }],
      }),
      this.prisma.caregiverProfile.count({ where: { archivedAt: null, status: 'ACTIVE' } }),
    ]);
    return { visits: await this.hydrate(rows), activeCaregivers };
  }

  async range(from: Date, to: Date): Promise<SchedulingVisitRow[]> {
    const rows = await this.prisma.visit.findMany({
      where: { scheduledDate: { gte: from, lt: to } },
      select: VISIT_SELECT,
      orderBy: [{ scheduledDate: 'asc' }, { startMinute: 'asc' }],
    });
    return this.hydrate(rows);
  }

  /** Hydrate recipient and caregiver names for a set of rows in two batched queries. */
  private async hydrate(rows: VisitRow[]): Promise<SchedulingVisitRow[]> {
    const recipientIds = [...new Set(rows.map((r) => r.careRecipientId))];
    const caregiverIds = [
      ...new Set(rows.map((r) => r.caregiverId).filter((id): id is string => id !== null)),
    ];

    const [recipients, caregivers] = await Promise.all([
      recipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, name: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { id: { in: caregiverIds } },
            select: { id: true, firstName: true, lastName: true },
          }),
    ]);

    const recipientNames = new Map(recipients.map((r) => [r.id, r.name]));
    const caregiverNames = new Map(
      caregivers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
    );

    return rows.map((row) => ({
      id: row.id,
      scheduledDate: row.scheduledDate,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      visitType: String(row.visitType),
      priority: String(row.priority),
      status: String(row.status),
      caregiverId: row.caregiverId,
      recipientName: recipientNames.get(row.careRecipientId) ?? 'Unknown',
      caregiverName:
        row.caregiverId === null ? null : (caregiverNames.get(row.caregiverId) ?? null),
    }));
  }
}
