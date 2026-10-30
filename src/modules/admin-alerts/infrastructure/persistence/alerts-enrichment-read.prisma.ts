import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AlertsEnrichmentReadModel,
  AlertsEnrichmentView,
} from '../../application/ports/alerts-enrichment-read.port';

/** Prisma read model that resolves alert source names, branches and service types. */
@Injectable()
export class AlertsEnrichmentReadPrisma implements AlertsEnrichmentReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async enrich(
    recipientIds: string[],
    caregiverIds: string[],
    visitIds: string[],
  ): Promise<AlertsEnrichmentView> {
    const [recipients, profiles, visits] = await Promise.all([
      recipientIds.length === 0
        ? Promise.resolve([])
        : this.prisma.careRecipient.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, name: true },
          }),
      caregiverIds.length === 0
        ? Promise.resolve([])
        : this.prisma.caregiverProfile.findMany({
            where: { userId: { in: caregiverIds } },
            select: { userId: true, branch: true },
          }),
      visitIds.length === 0
        ? Promise.resolve([])
        : this.prisma.visit.findMany({
            where: { id: { in: visitIds } },
            select: { id: true, visitType: true },
          }),
    ]);

    return {
      recipientNames: new Map(recipients.map((r) => [r.id, r.name])),
      caregiverBranches: new Map(
        profiles.flatMap((p) =>
          p.branch === null ? [] : [[p.userId, p.branch] as [string, string]],
        ),
      ),
      visitServiceTypes: new Map(visits.map((v) => [v.id, String(v.visitType)])),
    };
  }

  async adminNames(adminIds: string[]): Promise<Map<string, string>> {
    if (adminIds.length === 0) {
      return new Map();
    }
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(admins.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));
  }
}
