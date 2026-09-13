import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { MedicationWarning } from '../../domain/medication-warning.entity';
import { MedicationWarningRepository } from '../../domain/medication-warning.repository';

/** Prisma backed adapter for the MedicationWarningRepository port. */
@Injectable()
export class MedicationWarningPrismaRepository implements MedicationWarningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForRecipient(careRecipientId: string, warnings: MedicationWarning[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.medicationWarning.deleteMany({ where: { careRecipientId } }),
      this.prisma.medicationWarning.createMany({
        data: warnings.map((warning) => ({
          id: warning.id,
          careRecipientId: warning.careRecipientId,
          title: warning.title,
          detail: warning.detail,
          position: warning.position,
        })),
      }),
    ]);
  }

  async listForRecipient(careRecipientId: string): Promise<MedicationWarning[]> {
    const rows = await this.prisma.medicationWarning.findMany({
      where: { careRecipientId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) =>
      MedicationWarning.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        title: row.title,
        detail: row.detail,
        position: row.position,
      }),
    );
  }
}
