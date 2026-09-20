import { Injectable } from '@nestjs/common';
import { CaregiverStatus as PrismaCaregiverStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CaregiverOverviewView,
  CaregiverPageView,
  CaregiverReadModel,
} from '../../application/ports/caregiver-read.port';

const DAY_MS = 86_400_000;
/** Visits scanned for the performance figures, so the read stays bounded. */
const VISIT_SCAN_DAYS = 90;
const VISIT_SCAN_LIMIT = 5000;

/**
 * Prisma read model for the Caregivers screen. Composes the caregiver profile overlay
 * with the identity user, current assignments, today's visits, the performance
 * figures (ratings via visits, visit counts, hours logged, missed), certifications
 * and this week's availability. Batched to avoid N plus 1.
 */
@Injectable()
export class CaregiverReadPrisma implements CaregiverReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    status: PrismaCaregiverStatus | null,
    page: number,
    pageSize: number,
  ): Promise<CaregiverPageView> {
    const where = status === null ? {} : { status };
    const [total, profiles] = await this.prisma.$transaction([
      this.prisma.caregiverProfile.count({ where }),
      this.prisma.caregiverProfile.findMany({
        where,
        orderBy: { sequence: 'asc' },
        skip: Math.max(0, (page - 1) * pageSize),
        take: pageSize,
      }),
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: profiles.map((p) => p.userId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const usersById = new Map(users.map((u) => [u.id, u]));

    return {
      total,
      rows: profiles.map((profile) => {
        const user = usersById.get(profile.userId);
        return {
          id: profile.id,
          reference: `CG-${String(profile.sequence).padStart(3, '0')}`,
          name: user === undefined ? '' : `${user.firstName} ${user.lastName}`.trim(),
          title: profile.title,
          branch: profile.branch,
          employmentType: profile.employmentType,
          status: profile.status,
        };
      }),
    };
  }

  async overview(profileId: string, now: Date): Promise<CaregiverOverviewView | null> {
    const profile = await this.prisma.caregiverProfile.findUnique({
      where: { id: profileId },
      include: { notes: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (profile === null) {
      return null;
    }
    const caregiverId = profile.userId;
    const todayStart = startOfUtcDay(now);
    const tomorrow = new Date(todayStart.getTime() + DAY_MS);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const scanStart = new Date(now.getTime() - VISIT_SCAN_DAYS * DAY_MS);
    const weekStart = startOfUtcWeek(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

    const [user, assignments, todayVisits, scanVisits, certifications, availability] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: caregiverId },
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            dateOfBirth: true,
          },
        }),
        this.prisma.careTeamAssignment.findMany({
          where: { caregiverId, removedAt: null },
          select: { careRecipientId: true, role: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.visit.findMany({
          where: { caregiverId, scheduledDate: { gte: todayStart, lt: tomorrow } },
          select: {
            careRecipientId: true,
            startMinute: true,
            visitType: true,
            status: true,
          },
          orderBy: { startMinute: 'asc' },
        }),
        this.prisma.visit.findMany({
          where: { caregiverId, scheduledDate: { gte: scanStart } },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            clockInAt: true,
            clockOutAt: true,
          },
          take: VISIT_SCAN_LIMIT,
        }),
        this.prisma.certification.findMany({
          where: { caregiverId },
          select: { name: true, expiresAt: true },
          orderBy: { expiresAt: 'asc' },
        }),
        this.prisma.caregiverAvailability.findMany({
          where: { caregiverId, date: { gte: weekStart, lt: weekEnd } },
          select: { date: true, slots: { select: { startMinute: true, endMinute: true } } },
          orderBy: { date: 'asc' },
        }),
      ]);

    const recipientIds = [
      ...new Set([
        ...assignments.map((a) => a.careRecipientId),
        ...todayVisits.map((v) => v.careRecipientId),
      ]),
    ];
    const recipients = await this.prisma.careRecipient.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true, name: true },
    });
    const recipientNames = new Map(recipients.map((r) => [r.id, r.name]));

    const ratings =
      scanVisits.length === 0
        ? { _avg: { score: null }, _count: { _all: 0 } }
        : await this.prisma.careRating.aggregate({
            where: { visitId: { in: scanVisits.map((v) => v.id) } },
            _avg: { score: true },
            _count: { _all: true },
          });

    const monthVisits = scanVisits.filter((v) => v.scheduledDate.getTime() >= monthStart.getTime());
    const completed = monthVisits.filter((v) => v.status === 'COMPLETED');
    const hoursLoggedTenths = completed.reduce((sum, visit) => {
      if (visit.clockInAt === null || visit.clockOutAt === null) {
        return sum;
      }
      const tenths = Math.round((visit.clockOutAt.getTime() - visit.clockInAt.getTime()) / 360_000);
      return sum + Math.max(0, tenths);
    }, 0);

    return {
      id: profile.id,
      reference: `CG-${String(profile.sequence).padStart(3, '0')}`,
      userId: caregiverId,
      name: user === null ? '' : `${user.firstName} ${user.lastName}`.trim(),
      status: profile.status,
      title: profile.title,
      branch: profile.branch,
      employmentType: profile.employmentType,
      experienceYears: profile.experienceYears,
      joinedAt: profile.joinedAt,
      phone: user?.phone ?? null,
      email: user?.email ?? null,
      address: user === null ? null : formatAddress(user),
      dateOfBirth: user?.dateOfBirth ?? null,
      languages: profile.languages,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      emergencyContactRelationship: profile.emergencyContactRelationship,
      skills: profile.skills,
      assignments: assignments.map((a) => ({
        recipientName: recipientNames.get(a.careRecipientId) ?? 'Unknown',
        role: String(a.role),
        since: a.createdAt,
      })),
      todaySchedule: todayVisits.map((v) => ({
        startMinute: v.startMinute,
        recipientName: recipientNames.get(v.careRecipientId) ?? 'Unknown',
        visitType: String(v.visitType),
        status: String(v.status),
      })),
      performance: {
        ratingAverage:
          ratings._avg.score === null ? null : Math.round(ratings._avg.score * 10) / 10,
        ratingCount: ratings._count._all,
        visitsThisMonth: monthVisits.length,
        hoursLoggedTenths,
        missedVisits: monthVisits.filter((v) => v.status === 'MISSED').length,
        completedVisits: completed.length,
      },
      certifications: certifications.map((c) => ({
        name: c.name,
        expiresAt: c.expiresAt,
        valid: c.expiresAt.getTime() > now.getTime(),
      })),
      availability: availability.map((a) => ({ date: a.date, slots: a.slots })),
      recentNotes: profile.notes.map((note) => ({
        body: note.body,
        authorName: note.authorName,
        createdAt: note.createdAt,
      })),
    };
  }
}

/** Midnight (UTC) of the day the instant falls on. */
function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

/** Monday (UTC) of the week the instant falls in. */
function startOfUtcWeek(value: Date): Date {
  const day = startOfUtcDay(value);
  const weekday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - weekday * DAY_MS);
}

/** One line address from a user's structured address fields. */
function formatAddress(user: {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
}): string {
  const line2 = user.addressLine2 === null ? '' : `${user.addressLine2}, `;
  return `${user.addressLine1}, ${line2}${user.city}, ${user.state} ${user.postalCode}`;
}
