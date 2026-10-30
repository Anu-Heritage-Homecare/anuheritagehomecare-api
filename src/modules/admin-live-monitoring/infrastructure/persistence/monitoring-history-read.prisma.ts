import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  IncidentCategory,
  IncidentStatus,
  VisitStatus,
} from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  CompletedVisitRow,
  MonitoringHistoryFilter,
  MonitoringHistoryReadModel,
  PastAlertRow,
  PastAlertsFilter,
  PastIncidentRow,
  PastIncidentsFilter,
} from '../../application/ports/monitoring-history-read.port';

/** Prisma read model for the Monitoring History screen (queries each context's tables). */
@Injectable()
export class MonitoringHistoryReadPrisma implements MonitoringHistoryReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async completedVisits(
    filter: MonitoringHistoryFilter,
    cap: number,
  ): Promise<CompletedVisitRow[]> {
    const branchCaregiverIds = await this.caregiverIdsForBranch(filter.branch);
    if (branchCaregiverIds !== null && branchCaregiverIds.length === 0) {
      return [];
    }

    const visits = await this.prisma.visit.findMany({
      where: {
        status: VisitStatus.COMPLETED,
        scheduledDate: { gte: filter.from },
        ...(filter.careRecipientId === null ? {} : { careRecipientId: filter.careRecipientId }),
        ...(filter.caregiverId === null ? {} : { caregiverId: filter.caregiverId }),
        ...(branchCaregiverIds === null ? {} : { caregiverId: { in: branchCaregiverIds } }),
      },
      orderBy: { scheduledDate: 'desc' },
      take: cap,
      select: {
        id: true,
        sequence: true,
        scheduledDate: true,
        startMinute: true,
        endMinute: true,
        clockInAt: true,
        clockOutAt: true,
        careRecipientId: true,
        caregiverId: true,
      },
    });

    const recipientIds = [...new Set(visits.map((v) => v.careRecipientId))];
    const caregiverIds = [
      ...new Set(visits.map((v) => v.caregiverId).filter((id): id is string => id !== null)),
    ];
    const [recipientNames, caregivers, branches] = await Promise.all([
      this.recipientNames(recipientIds),
      this.caregiverNames(caregiverIds),
      this.caregiverBranches(caregiverIds),
    ]);

    return visits.map((v) => ({
      id: v.id,
      sequence: v.sequence,
      scheduledDate: v.scheduledDate,
      startMinute: v.startMinute,
      endMinute: v.endMinute,
      clockInAt: v.clockInAt,
      clockOutAt: v.clockOutAt,
      recipientName: recipientNames.get(v.careRecipientId) ?? 'Unknown',
      caregiverName: v.caregiverId === null ? null : (caregivers.get(v.caregiverId) ?? null),
      caregiverBranch: v.caregiverId === null ? null : (branches.get(v.caregiverId) ?? null),
    }));
  }

  async pastAlerts(
    filter: MonitoringHistoryFilter,
    alertFilter: PastAlertsFilter,
    cap: number,
  ): Promise<PastAlertRow[]> {
    const branchCaregiverIds = await this.caregiverIdsForBranch(filter.branch);
    if (branchCaregiverIds !== null && branchCaregiverIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.operationalAlert.findMany({
      where: {
        status: { in: [AlertStatus.RESOLVED, AlertStatus.DISMISSED] },
        resolvedAt: { gte: filter.from },
        ...(filter.careRecipientId === null
          ? {}
          : { relatedCareRecipientId: filter.careRecipientId }),
        ...(filter.caregiverId === null ? {} : { relatedCaregiverId: filter.caregiverId }),
        ...(branchCaregiverIds === null ? {} : { relatedCaregiverId: { in: branchCaregiverIds } }),
        ...(alertFilter.severity === null
          ? {}
          : { severity: alertFilter.severity as AlertSeverity }),
        ...(alertFilter.alertType === null ? {} : { type: alertFilter.alertType as AlertType }),
      },
      orderBy: { resolvedAt: 'desc' },
      take: cap,
    });

    const recipientIds = [
      ...new Set(
        rows.map((r) => r.relatedCareRecipientId).filter((id): id is string => id !== null),
      ),
    ];
    const caregiverIds = [
      ...new Set(rows.map((r) => r.relatedCaregiverId).filter((id): id is string => id !== null)),
    ];
    const [recipientNames, branches] = await Promise.all([
      this.recipientNames(recipientIds),
      this.caregiverBranches(caregiverIds),
    ]);

    return rows.map((r) => ({
      id: r.id,
      type: String(r.type),
      severity: String(r.severity),
      status: String(r.status),
      description: r.description,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt as Date,
      resolvedByAdminId: r.resolvedByAdminId,
      recipientName:
        r.relatedCareRecipientId === null
          ? null
          : (recipientNames.get(r.relatedCareRecipientId) ?? null),
      caregiverBranch:
        r.relatedCaregiverId === null ? null : (branches.get(r.relatedCaregiverId) ?? null),
    }));
  }

  async pastIncidents(
    filter: MonitoringHistoryFilter,
    incidentFilter: PastIncidentsFilter,
    cap: number,
  ): Promise<PastIncidentRow[]> {
    const branchCaregiverIds = await this.caregiverIdsForBranch(filter.branch);
    if (branchCaregiverIds !== null && branchCaregiverIds.length === 0) {
      return [];
    }

    const statuses =
      incidentFilter.status === null
        ? [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
        : [incidentFilter.status as IncidentStatus];

    const rows = await this.prisma.incident.findMany({
      where: {
        status: { in: statuses },
        resolvedAt: { gte: filter.from },
        ...(filter.careRecipientId === null
          ? {}
          : { relatedCareRecipientId: filter.careRecipientId }),
        ...(filter.caregiverId === null ? {} : { relatedCaregiverId: filter.caregiverId }),
        ...(branchCaregiverIds === null ? {} : { relatedCaregiverId: { in: branchCaregiverIds } }),
        ...(incidentFilter.category === null
          ? {}
          : { category: incidentFilter.category as IncidentCategory }),
        ...(incidentFilter.severity === null
          ? {}
          : { severity: incidentFilter.severity as AlertSeverity }),
      },
      orderBy: { resolvedAt: 'desc' },
      take: cap,
    });

    const recipientIds = [
      ...new Set(
        rows.map((r) => r.relatedCareRecipientId).filter((id): id is string => id !== null),
      ),
    ];
    const recipientNames = await this.recipientNames(recipientIds);

    return rows.map((r) => ({
      id: r.id,
      sequence: r.sequence,
      category: String(r.category),
      severity: String(r.severity),
      status: String(r.status),
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt as Date,
      resolvedByAdminId: r.resolvedByAdminId,
      reporterName: r.reporterName,
      recipientName:
        r.relatedCareRecipientId === null
          ? null
          : (recipientNames.get(r.relatedCareRecipientId) ?? null),
    }));
  }

  /** The caregiver userIds in a branch, or null when no branch filter is set. */
  private async caregiverIdsForBranch(branch: string | null): Promise<string[] | null> {
    if (branch === null) {
      return null;
    }
    const profiles = await this.prisma.caregiverProfile.findMany({
      where: { branch },
      select: { userId: true },
    });
    return profiles.map((p) => p.userId);
  }

  private async recipientNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  private async caregiverNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
  }

  private async caregiverBranches(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.caregiverProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, branch: true },
    });
    return new Map(
      rows.flatMap((r) => (r.branch === null ? [] : [[r.userId, r.branch] as [string, string]])),
    );
  }
}
