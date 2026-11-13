import { Injectable } from '@nestjs/common';
import { Prisma, VisitCancellationReason, VisitStatus, VisitType } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  OperationsReportFilter,
  OperationsReportReadModel,
  OperationsReportView,
  OpsCancellationReason,
  OpsDailyPoint,
  OpsLocationBucket,
  OpsServiceType,
  OpsVisitCounts,
  OpsWeeklyBucket,
} from '../../application/ports/operations-report-read.port';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const UNSPECIFIED = 'UNSPECIFIED';
const UNKNOWN_CITY = 'Unknown';

interface VisitRow {
  status: VisitStatus;
  scheduledDate: Date;
  clockInAt: Date | null;
  clockOutAt: Date | null;
  visitType: VisitType;
  careRecipientId: string;
  cancellationReason: VisitCancellationReason | null;
}

/**
 * Prisma read model for the Operations Report drill down. Loads the period's visits
 * (and the equal length window just before, for the deltas and trends) once, resolves
 * each visit to its care recipient's city for the location breakdown, and buckets the
 * daily, weekly, cancellation, service type and location aggregates in memory.
 *
 * shortcut: scans the period's visits per request, fine for an agency's volumes; move
 * the bucketing into SQL when visit counts reach the tens of thousands.
 */
@Injectable()
export class OperationsReportReadPrisma implements OperationsReportReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async report(filter: OperationsReportFilter): Promise<OperationsReportView> {
    const length = filter.to.getTime() - filter.from.getTime();
    const previousFrom = new Date(filter.from.getTime() - length);
    const cityRecipientIds =
      filter.city === null ? null : await this.recipientIdsInCity(filter.city);

    const [current, previous, ratings] = await Promise.all([
      this.visitRows(filter, filter.from, filter.to, cityRecipientIds),
      this.visitRows(filter, previousFrom, filter.from, cityRecipientIds),
      this.prisma.careRating.findMany({
        where: { createdAt: { gte: filter.from, lte: filter.to }, careRecipientId: { not: null } },
        select: { score: true, careRecipientId: true },
      }),
    ]);

    const recipientIds = new Set<string>();
    for (const visit of current) recipientIds.add(visit.careRecipientId);
    for (const visit of previous) recipientIds.add(visit.careRecipientId);
    for (const rating of ratings) {
      if (rating.careRecipientId !== null) recipientIds.add(rating.careRecipientId);
    }
    const cityByRecipient = await this.cityByRecipient([...recipientIds]);

    return {
      current: buildCounts(current),
      previousTotal: previous.length,
      daily: buildDaily(current, filter.from, filter.to),
      weekly: buildWeekly(current, filter.from),
      cancellationReasons: buildCancellationReasons(current),
      serviceTypes: buildServiceTypes(current),
      locations: buildLocations(current, previous, ratings, cityByRecipient),
    };
  }

  private async recipientIdsInCity(city: string): Promise<string[]> {
    const rows = await this.prisma.careRecipient.findMany({
      where: { city },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async cityByRecipient(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: ids } },
      select: { id: true, city: true },
    });
    return new Map(rows.map((r) => [r.id, r.city]));
  }

  private async visitRows(
    filter: OperationsReportFilter,
    from: Date,
    to: Date,
    cityRecipientIds: string[] | null,
  ): Promise<VisitRow[]> {
    const where: Prisma.VisitWhereInput = {
      scheduledDate: { gte: startOfDay(from), lte: to },
    };
    if (filter.visitType !== null) where.visitType = filter.visitType;
    if (filter.caregiverId !== null) where.caregiverId = filter.caregiverId;
    if (filter.status !== null) where.status = filter.status;
    if (cityRecipientIds !== null) where.careRecipientId = { in: cityRecipientIds };
    return this.prisma.visit.findMany({
      where,
      select: {
        status: true,
        scheduledDate: true,
        clockInAt: true,
        clockOutAt: true,
        visitType: true,
        careRecipientId: true,
        cancellationReason: true,
      },
    });
  }
}

function buildCounts(visits: VisitRow[]): OpsVisitCounts {
  const counts: OpsVisitCounts = {
    total: visits.length,
    completed: 0,
    cancelled: 0,
    loggedSeconds: 0,
    durationCount: 0,
  };
  for (const visit of visits) {
    if (visit.status === 'COMPLETED') {
      counts.completed += 1;
      if (visit.clockInAt !== null && visit.clockOutAt !== null) {
        counts.loggedSeconds += Math.max(
          0,
          (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 1000,
        );
        counts.durationCount += 1;
      }
    } else if (visit.status === 'CANCELLED') {
      counts.cancelled += 1;
    }
  }
  return counts;
}

function buildDaily(visits: VisitRow[], from: Date, to: Date): OpsDailyPoint[] {
  const byDay = new Map<string, number>();
  for (const visit of visits) {
    const key = dayKey(visit.scheduledDate);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const points: OpsDailyPoint[] = [];
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  for (let day = start; day <= end; day += DAY_MS) {
    const date = new Date(day);
    points.push({ date, visits: byDay.get(dayKey(date)) ?? 0 });
  }
  return points;
}

function buildWeekly(visits: VisitRow[], from: Date): OpsWeeklyBucket[] {
  const start = startOfDay(from).getTime();
  const weeks: OpsWeeklyBucket[] = [];
  for (const visit of visits) {
    const index = Math.floor(
      (startOfDay(visit.scheduledDate).getTime() - start) / (WEEK_DAYS * DAY_MS),
    );
    if (index < 0) {
      continue;
    }
    while (weeks.length <= index) {
      weeks.push({ label: `W${weeks.length + 1}`, completed: 0, total: 0 });
    }
    weeks[index].total += 1;
    if (visit.status === 'COMPLETED') {
      weeks[index].completed += 1;
    }
  }
  return weeks;
}

function buildCancellationReasons(visits: VisitRow[]): OpsCancellationReason[] {
  const byReason = new Map<string, number>();
  for (const visit of visits) {
    if (visit.status !== 'CANCELLED') {
      continue;
    }
    const reason = visit.cancellationReason ?? UNSPECIFIED;
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  }
  return [...byReason.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function buildServiceTypes(visits: VisitRow[]): OpsServiceType[] {
  const byType = new Map<string, number>();
  for (const visit of visits) {
    byType.set(visit.visitType, (byType.get(visit.visitType) ?? 0) + 1);
  }
  return [...byType.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function buildLocations(
  current: VisitRow[],
  previous: VisitRow[],
  ratings: { score: number; careRecipientId: string | null }[],
  cityByRecipient: Map<string, string>,
): OpsLocationBucket[] {
  const cityOf = (recipientId: string): string => cityByRecipient.get(recipientId) ?? UNKNOWN_CITY;

  const previousByCity = new Map<string, { completed: number; total: number }>();
  for (const visit of previous) {
    const city = cityOf(visit.careRecipientId);
    const entry = previousByCity.get(city) ?? { completed: 0, total: 0 };
    entry.total += 1;
    if (visit.status === 'COMPLETED') {
      entry.completed += 1;
    }
    previousByCity.set(city, entry);
  }

  const satisfactionByCity = new Map<string, { sum: number; count: number }>();
  for (const rating of ratings) {
    if (rating.careRecipientId === null) {
      continue;
    }
    const city = cityOf(rating.careRecipientId);
    const entry = satisfactionByCity.get(city) ?? { sum: 0, count: 0 };
    entry.sum += rating.score;
    entry.count += 1;
    satisfactionByCity.set(city, entry);
  }

  const buckets = new Map<string, OpsLocationBucket>();
  for (const visit of current) {
    const city = cityOf(visit.careRecipientId);
    const bucket = buckets.get(city) ?? {
      city,
      total: 0,
      completed: 0,
      loggedSeconds: 0,
      durationCount: 0,
      satisfactionSum: 0,
      satisfactionCount: 0,
      previousCompletionRate: null,
    };
    bucket.total += 1;
    if (visit.status === 'COMPLETED') {
      bucket.completed += 1;
      if (visit.clockInAt !== null && visit.clockOutAt !== null) {
        bucket.loggedSeconds += Math.max(
          0,
          (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 1000,
        );
        bucket.durationCount += 1;
      }
    }
    buckets.set(city, bucket);
  }

  for (const bucket of buckets.values()) {
    const satisfaction = satisfactionByCity.get(bucket.city);
    if (satisfaction !== undefined) {
      bucket.satisfactionSum = satisfaction.sum;
      bucket.satisfactionCount = satisfaction.count;
    }
    const prior = previousByCity.get(bucket.city);
    bucket.previousCompletionRate =
      prior === undefined || prior.total === 0
        ? null
        : round1((prior.completed / prior.total) * 100);
  }

  return [...buckets.values()].sort((a, b) => b.total - a.total);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
