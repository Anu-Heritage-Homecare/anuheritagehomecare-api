import { Injectable } from '@nestjs/common';
import { Prisma, VisitStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  WorkforceAttendanceDay,
  WorkforceCaregiverAggregate,
  WorkforceExpiringCertification,
  WorkforceReportFilter,
  WorkforceReportReadModel,
  WorkforceReportView,
  WorkforceWeeklyBucket,
} from '../../application/ports/workforce-report-read.port';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const WEEK_DAYS = 7;
const ON_TIME_GRACE_MINUTES = 5;
const DEFAULT_WEEKLY_HOURS = 40;
const CERT_LOOKAHEAD_DAYS = 45;

interface VisitRow {
  caregiverId: string | null;
  status: VisitStatus;
  scheduledDate: Date;
  startMinute: number;
  clockInAt: Date | null;
  clockOutAt: Date | null;
}

/**
 * Prisma read model for the Workforce Report drill down. Resolves the caregivers in scope
 * (active profiles, filtered by branch and employment type), then loads their visits,
 * ratings, trainings and soon to expire certifications over the period and aggregates
 * each caregiver, the weekly utilization and the daily attendance in memory.
 *
 * shortcut: scans the period's visits and ratings per request, fine for an agency's
 * caregiver counts; move the per caregiver roll ups into SQL when the roster is large.
 */
@Injectable()
export class WorkforceReportReadPrisma implements WorkforceReportReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async report(filter: WorkforceReportFilter): Promise<WorkforceReportView> {
    const profileWhere: Prisma.CaregiverProfileWhereInput = {
      archivedAt: null,
      status: 'ACTIVE',
    };
    if (filter.branch !== null) profileWhere.branch = filter.branch;
    if (filter.employmentType !== null) profileWhere.employmentType = filter.employmentType;
    if (filter.caregiverId !== null) profileWhere.userId = filter.caregiverId;

    const [profiles, totalCaregivers] = await Promise.all([
      this.prisma.caregiverProfile.findMany({
        where: profileWhere,
        select: { userId: true, title: true, maxHoursPerWeek: true },
      }),
      this.prisma.caregiverProfile.count({ where: { archivedAt: null } }),
    ]);

    const userIds = profiles.map((p) => p.userId);
    const certCutoff = new Date(filter.now.getTime() + CERT_LOOKAHEAD_DAYS * DAY_MS);

    const [users, visits, ratings, trainings, certs] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, photoKey: true },
      }),
      this.prisma.visit.findMany({
        where: {
          caregiverId: { in: userIds },
          scheduledDate: { gte: startOfDay(filter.from), lte: filter.to },
        },
        select: {
          caregiverId: true,
          status: true,
          scheduledDate: true,
          startMinute: true,
          clockInAt: true,
          clockOutAt: true,
        },
      }),
      this.prisma.careRating.findMany({
        where: { caregiverId: { in: userIds }, createdAt: { gte: filter.from, lte: filter.to } },
        select: { caregiverId: true, score: true, reviewerType: true },
      }),
      this.prisma.caregiverTraining.findMany({
        where: { caregiverId: { in: userIds }, status: 'IN_PROGRESS' },
        select: { caregiverId: true },
      }),
      this.prisma.certification.findMany({
        where: { caregiverId: { in: userIds }, expiresAt: { gte: filter.now, lte: certCutoff } },
        select: { caregiverId: true, name: true, expiresAt: true },
        orderBy: { expiresAt: 'asc' },
      }),
    ]);

    const titleByUser = new Map(profiles.map((p) => [p.userId, p.title]));
    const nameByUser = new Map<string, string>();
    const photoByUser = new Map<string, string | null>();
    for (const user of users) {
      const title = titleByUser.get(user.id);
      const base = `${user.firstName} ${user.lastName}`;
      nameByUser.set(user.id, title ? `${base}, ${title}` : base);
      photoByUser.set(user.id, user.photoKey);
    }

    const incompleteTraining = new Set(trainings.map((t) => t.caregiverId));
    const caregivers = this.aggregateCaregivers(
      profiles.map((p) => p.userId),
      visits,
      ratings,
      incompleteTraining,
      nameByUser,
      photoByUser,
    );

    const weeklyCapacityHours = profiles.reduce(
      (total, p) => total + (p.maxHoursPerWeek ?? DEFAULT_WEEKLY_HOURS),
      0,
    );

    return {
      caregivers,
      totalCaregivers,
      weeklyCapacityHours,
      weekly: buildWeekly(visits, filter.from, filter.to),
      attendanceDaily: buildAttendanceDaily(visits, filter.from, filter.to),
      expiringCertifications: certs.map((cert): WorkforceExpiringCertification => ({
        caregiverId: cert.caregiverId,
        caregiverName: nameByUser.get(cert.caregiverId) ?? 'Unknown',
        credentialName: cert.name,
        expiresAt: cert.expiresAt,
        daysUntilExpiry: Math.max(
          0,
          Math.floor((cert.expiresAt.getTime() - filter.now.getTime()) / DAY_MS),
        ),
      })),
    };
  }

  private aggregateCaregivers(
    userIds: string[],
    visits: VisitRow[],
    ratings: { caregiverId: string | null; score: number; reviewerType: string }[],
    incompleteTraining: Set<string>,
    nameByUser: Map<string, string>,
    photoByUser: Map<string, string | null>,
  ): WorkforceCaregiverAggregate[] {
    const byId = new Map<string, WorkforceCaregiverAggregate>();
    for (const id of userIds) {
      byId.set(id, {
        caregiverId: id,
        name: nameByUser.get(id) ?? 'Unknown',
        photoKey: photoByUser.get(id) ?? null,
        visitsTotal: 0,
        visitsCompleted: 0,
        visitsMissed: 0,
        started: 0,
        onTime: 0,
        loggedSeconds: 0,
        ratingSum: 0,
        ratingCount: 0,
        csatSum: 0,
        csatCount: 0,
        hasIncompleteTraining: incompleteTraining.has(id),
      });
    }

    for (const visit of visits) {
      if (visit.caregiverId === null) {
        continue;
      }
      const row = byId.get(visit.caregiverId);
      if (row === undefined) {
        continue;
      }
      row.visitsTotal += 1;
      if (visit.status === 'COMPLETED') {
        row.visitsCompleted += 1;
        if (visit.clockInAt !== null && visit.clockOutAt !== null) {
          row.loggedSeconds += Math.max(
            0,
            (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 1000,
          );
        }
      } else if (visit.status === 'MISSED') {
        row.visitsMissed += 1;
      }
      if (visit.clockInAt !== null) {
        row.started += 1;
        const scheduledStart = visit.scheduledDate.getTime() + visit.startMinute * MINUTE_MS;
        if (visit.clockInAt.getTime() <= scheduledStart + ON_TIME_GRACE_MINUTES * MINUTE_MS) {
          row.onTime += 1;
        }
      }
    }

    for (const rating of ratings) {
      if (rating.caregiverId === null) {
        continue;
      }
      const row = byId.get(rating.caregiverId);
      if (row === undefined) {
        continue;
      }
      row.ratingSum += rating.score;
      row.ratingCount += 1;
      if (rating.reviewerType === 'FAMILY') {
        row.csatSum += rating.score;
        row.csatCount += 1;
      }
    }

    return [...byId.values()];
  }
}

function buildWeekly(visits: VisitRow[], from: Date, to: Date): WorkforceWeeklyBucket[] {
  const start = startOfDay(from).getTime();
  const totalDays = Math.max(1, Math.ceil((startOfDay(to).getTime() - start) / DAY_MS) + 1);
  const weekCount = Math.ceil(totalDays / WEEK_DAYS);
  const weeks: WorkforceWeeklyBucket[] = Array.from({ length: weekCount }, (_unused, index) => ({
    label: `Week ${index + 1}`,
    loggedSeconds: 0,
    days: Math.min(WEEK_DAYS, totalDays - index * WEEK_DAYS),
  }));
  for (const visit of visits) {
    if (visit.status !== 'COMPLETED' || visit.clockInAt === null || visit.clockOutAt === null) {
      continue;
    }
    const index = Math.floor(
      (startOfDay(visit.scheduledDate).getTime() - start) / (WEEK_DAYS * DAY_MS),
    );
    if (index < 0 || index >= weeks.length) {
      continue;
    }
    weeks[index].loggedSeconds += Math.max(
      0,
      (visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 1000,
    );
  }
  return weeks;
}

function buildAttendanceDaily(visits: VisitRow[], from: Date, to: Date): WorkforceAttendanceDay[] {
  const byDay = new Map<string, { total: number; nonMissed: number }>();
  for (const visit of visits) {
    const key = dayKey(visit.scheduledDate);
    const entry = byDay.get(key) ?? { total: 0, nonMissed: 0 };
    entry.total += 1;
    if (visit.status !== 'MISSED') {
      entry.nonMissed += 1;
    }
    byDay.set(key, entry);
  }
  const days: WorkforceAttendanceDay[] = [];
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  for (let day = start; day <= end; day += DAY_MS) {
    const date = new Date(day);
    const entry = byDay.get(dayKey(date)) ?? { total: 0, nonMissed: 0 };
    days.push({ date, total: entry.total, nonMissed: entry.nonMissed });
  }
  return days;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
