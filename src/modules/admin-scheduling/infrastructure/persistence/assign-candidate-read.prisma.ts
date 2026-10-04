import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AssignCandidateRaw,
  AssignCandidateReadModel,
  AssignMatchContext,
} from '../../application/ports/assign-candidate-read.port';

const DAY_MS = 86_400_000;

/**
 * Prisma read model for the Assign Caregiver screen. Loads the visit and its
 * recipient, every active caregiver, and for those caregivers their visits on the
 * day, their availability windows, certifications, rating and last known location,
 * all in batched queries.
 */
@Injectable()
export class AssignCandidateReadPrisma implements AssignCandidateReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async matchContext(visitId: string): Promise<AssignMatchContext | null> {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        status: true,
        careRecipientId: true,
        scheduledDate: true,
        startMinute: true,
        endMinute: true,
        visitType: true,
        priority: true,
      },
    });
    if (visit === null) {
      return null;
    }
    const recipient = await this.prisma.careRecipient.findUnique({
      where: { id: visit.careRecipientId },
      select: { name: true, fullAddress: true, latitude: true, longitude: true },
    });

    const dayStart = startOfUtcDay(visit.scheduledDate);
    const nextDay = new Date(dayStart.getTime() + DAY_MS);

    const profiles = await this.prisma.caregiverProfile.findMany({
      where: { archivedAt: null, status: 'ACTIVE' },
      select: { userId: true, title: true, branch: true, skills: true },
    });
    const caregiverIds = profiles.map((p) => p.userId);

    const [users, dayVisits, availability, certifications, ratings, locations] = await Promise.all([
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { id: { in: caregiverIds } },
            select: { id: true, firstName: true, lastName: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.visit.findMany({
            where: {
              caregiverId: { in: caregiverIds },
              scheduledDate: { gte: dayStart, lt: nextDay },
            },
            select: { caregiverId: true, startMinute: true, endMinute: true, status: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.caregiverAvailability.findMany({
            where: { caregiverId: { in: caregiverIds }, date: dayStart },
            select: {
              caregiverId: true,
              slots: { select: { startMinute: true, endMinute: true } },
            },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.certification.findMany({
            where: { caregiverId: { in: caregiverIds } },
            select: { caregiverId: true, name: true, expiresAt: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRating.groupBy({
            by: ['caregiverId'],
            where: { caregiverId: { in: caregiverIds } },
            _avg: { score: true },
            _count: { _all: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.locationPing.findMany({
            where: { caregiverId: { in: caregiverIds } },
            distinct: ['caregiverId'],
            orderBy: [{ caregiverId: 'asc' }, { recordedAt: 'desc' }],
            select: { caregiverId: true, latitude: true, longitude: true },
          }),
    ]);

    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const visitsBy = groupBy(dayVisits, (v) => v.caregiverId);
    const availBy = new Map(availability.map((a) => [a.caregiverId, a.slots]));
    const certsBy = groupBy(certifications, (c) => c.caregiverId);
    const ratingBy = new Map(
      ratings.map((r) => [r.caregiverId, { avg: r._avg.score, count: r._count._all }]),
    );
    const locationBy = new Map(locations.map((l) => [l.caregiverId, l]));

    const candidates: AssignCandidateRaw[] = profiles.map((profile) => {
      const id = profile.userId;
      const rating = ratingBy.get(id);
      const location = locationBy.get(id);
      return {
        caregiverId: id,
        name: nameById.get(id) ?? 'Unknown',
        title: profile.title,
        branch: profile.branch,
        skills: profile.skills,
        ratingAverage: rating?.avg ?? null,
        ratingCount: rating?.count ?? 0,
        certifications: (certsBy.get(id) ?? []).map((c) => ({
          name: c.name,
          expiresAt: c.expiresAt,
        })),
        dayVisits: (visitsBy.get(id) ?? []).map((v) => ({
          startMinute: v.startMinute,
          endMinute: v.endMinute,
          status: String(v.status),
        })),
        availabilityWindows: availBy.get(id) ?? [],
        lastLatitude: location?.latitude ?? null,
        lastLongitude: location?.longitude ?? null,
      };
    });

    return {
      visit: {
        id: visit.id,
        status: String(visit.status),
        recipientName: recipient?.name ?? 'Unknown',
        serviceType: String(visit.visitType),
        priority: String(visit.priority),
        scheduledDate: visit.scheduledDate,
        startMinute: visit.startMinute,
        endMinute: visit.endMinute,
        location: recipient?.fullAddress ?? 'Unknown',
        recipientLatitude: recipient?.latitude ?? null,
        recipientLongitude: recipient?.longitude ?? null,
      },
      candidates,
    };
  }
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function groupBy<T, K>(items: T[], key: (item: T) => K | null): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === null) {
      continue;
    }
    const bucket = map.get(k) ?? [];
    bucket.push(item);
    map.set(k, bucket);
  }
  return map;
}
