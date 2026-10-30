import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  EmergencyEnrichmentReadModel,
  EmergencyEnrichmentView,
} from '../../application/ports/emergency-enrichment-read.port';

/** Resolves the caregiver name and the visit service for an emergency detail. */
@Injectable()
export class EmergencyEnrichmentReadPrisma implements EmergencyEnrichmentReadModel {
  constructor(private readonly prisma: PrismaService) {}

  async enrich(caregiverId: string, visitId: string): Promise<EmergencyEnrichmentView> {
    const [caregiver, visit] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: caregiverId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.visit.findUnique({ where: { id: visitId }, select: { visitType: true } }),
    ]);

    return {
      caregiverName: caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : null,
      visitService: visit ? displayService(visit.visitType) : null,
    };
  }
}

/** Title case a visit type for display, e.g. PERSONAL_CARE -> Personal Care. */
function displayService(visitType: string): string {
  return visitType
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
