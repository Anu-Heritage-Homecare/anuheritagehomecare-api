import { Injectable } from '@nestjs/common';
import { MedicationAdministrationOutcome as PrismaOutcome } from '@prisma/client';
import { MedicationAdministrationOutcome } from '@modules/visits/domain/medication-administration-outcome.enum';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import {
  AdministrationView,
  MedicationAdherenceCount,
  MedicationAdministrationDirectory,
} from '../../application/ports/medication-administration.port';

const TO_DOMAIN_OUTCOME: Record<PrismaOutcome, MedicationAdministrationOutcome> = {
  ADMINISTERED: MedicationAdministrationOutcome.Administered,
  REFUSED: MedicationAdministrationOutcome.Refused,
  OUT_OF_STOCK: MedicationAdministrationOutcome.OutOfStock,
  PATIENT_ASLEEP: MedicationAdministrationOutcome.PatientAsleep,
};

/**
 * Reads the visits context's medication administration records for the admin
 * Medications screen. Scoped to the recipient through the administration's visit
 * (no database foreign key to the medication itself). Coordinates and clinical
 * detail never appear here; only outcomes, times and the caregiver id.
 */
@Injectable()
export class VisitsMedicationAdministrationDirectory implements MedicationAdministrationDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async adherenceCounts(
    recipientId: string,
    from: Date,
    to: Date,
  ): Promise<Map<string, MedicationAdherenceCount>> {
    const groups = await this.prisma.medicationAdministration.groupBy({
      by: ['medicationId', 'outcome'],
      where: { visit: { careRecipientId: recipientId }, recordedAt: { gte: from, lte: to } },
      _count: { _all: true },
      orderBy: { medicationId: 'asc' },
    });
    const result = new Map<string, MedicationAdherenceCount>();
    for (const group of groups) {
      const current = result.get(group.medicationId) ?? { administered: 0, recorded: 0 };
      current.recorded += group._count._all;
      if (group.outcome === PrismaOutcome.ADMINISTERED) {
        current.administered += group._count._all;
      }
      result.set(group.medicationId, current);
    }
    return result;
  }

  async recentAdministrations(
    recipientId: string,
    since: Date,
    limit: number,
  ): Promise<AdministrationView[]> {
    const rows = await this.prisma.medicationAdministration.findMany({
      where: { visit: { careRecipientId: recipientId }, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: {
        medicationId: true,
        outcome: true,
        recordedAt: true,
        visit: { select: { caregiverId: true, scheduledDate: true } },
      },
    });
    return rows.map((row) => ({
      medicationId: row.medicationId,
      outcome: TO_DOMAIN_OUTCOME[row.outcome],
      recordedAt: row.recordedAt,
      caregiverId: row.visit.caregiverId,
      visitDate: row.visit.scheduledDate,
    }));
  }
}
