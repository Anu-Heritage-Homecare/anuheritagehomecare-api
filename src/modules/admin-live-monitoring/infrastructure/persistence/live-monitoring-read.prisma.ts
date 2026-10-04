import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  LiveMonitoringReadModel,
  LiveSnapshot,
  LiveVisitRow,
} from '../../application/ports/live-monitoring-read.port';

/**
 * Prisma read model for Live Monitoring. Loads the day's visits with the events the
 * activity feed needs, then batches the recipient and caregiver name, branch and
 * coordinate lookups, the active SOS alerts and the latest caregiver location pings.
 */
@Injectable()
export class LiveMonitoringReadPrisma implements LiveMonitoringReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(dayStart: Date, nextDay: Date): Promise<LiveSnapshot> {
    const visits = await this.prisma.visit.findMany({
      where: { scheduledDate: { gte: dayStart, lt: nextDay } },
      select: {
        id: true,
        status: true,
        caregiverId: true,
        careRecipientId: true,
        startMinute: true,
        endMinute: true,
        visitType: true,
        priority: true,
        clockInAt: true,
        clockOutAt: true,
        medicationAdministrations: { select: { recordedAt: true, outcome: true } },
        vitals: { select: { recordedAt: true, systolic: true, diastolic: true, heartRate: true } },
      },
    });

    const recipientIds = [...new Set(visits.map((v) => v.careRecipientId))];
    const caregiverIds = [
      ...new Set(visits.map((v) => v.caregiverId).filter((id): id is string => id !== null)),
    ];

    const [recipients, users, profiles, sos, locations] = await Promise.all([
      recipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, name: true, latitude: true, longitude: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { id: { in: caregiverIds } },
            select: { id: true, firstName: true, lastName: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.caregiverProfile.findMany({
            where: { userId: { in: caregiverIds } },
            select: { userId: true, branch: true },
          }),
      this.prisma.sosAlert.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
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

    const recipientById = new Map(recipients.map((r) => [r.id, r]));
    const nameById = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const branchById = new Map(profiles.map((p) => [p.userId, p.branch]));

    const rows: LiveVisitRow[] = visits.map((v) => {
      const recipient = recipientById.get(v.careRecipientId);
      return {
        id: v.id,
        status: String(v.status),
        caregiverId: v.caregiverId,
        careRecipientId: v.careRecipientId,
        startMinute: v.startMinute,
        endMinute: v.endMinute,
        visitType: String(v.visitType),
        priority: String(v.priority),
        clockInAt: v.clockInAt,
        clockOutAt: v.clockOutAt,
        recipientName: recipient?.name ?? 'Unknown',
        caregiverName: v.caregiverId === null ? null : (nameById.get(v.caregiverId) ?? null),
        caregiverBranch: v.caregiverId === null ? null : (branchById.get(v.caregiverId) ?? null),
        recipientLatitude: recipient?.latitude ?? null,
        recipientLongitude: recipient?.longitude ?? null,
        medications: v.medicationAdministrations.map((m) => ({
          recordedAt: m.recordedAt,
          outcome: String(m.outcome),
        })),
        vitals: v.vitals.map((r) => ({
          recordedAt: r.recordedAt,
          systolic: r.systolic,
          diastolic: r.diastolic,
          heartRate: r.heartRate,
        })),
      };
    });

    return {
      visits: rows,
      sosAlerts: sos.map((a) => ({
        id: a.id,
        caregiverId: a.caregiverId,
        caregiverName: nameById.get(a.caregiverId) ?? null,
        recipientName: a.recipientName,
        recipientAddress: a.recipientAddress,
        latitude: a.latitude,
        longitude: a.longitude,
        createdAt: a.createdAt,
        dispatchedAt: a.dispatchedAt,
      })),
      caregiverLocations: locations.map((l) => ({
        caregiverId: l.caregiverId,
        latitude: l.latitude,
        longitude: l.longitude,
      })),
    };
  }
}
