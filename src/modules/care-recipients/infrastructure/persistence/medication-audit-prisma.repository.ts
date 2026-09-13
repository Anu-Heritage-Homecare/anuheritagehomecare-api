import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { MedicationAudit } from '../../domain/medication-audit.entity';
import { MedicationAuditRepository } from '../../domain/medication-audit.repository';

/** Prisma backed adapter for the MedicationAuditRepository port (append only). */
@Injectable()
export class MedicationAuditPrismaRepository implements MedicationAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(audit: MedicationAudit): Promise<void> {
    await this.prisma.medicationAudit.create({
      data: {
        id: audit.id,
        careRecipientId: audit.careRecipientId,
        title: audit.title,
        detail: audit.detail,
        authorAdminId: audit.authorAdminId,
        createdAt: audit.createdAt,
      },
    });
  }

  async listForRecipient(careRecipientId: string, limit: number): Promise<MedicationAudit[]> {
    const rows = await this.prisma.medicationAudit.findMany({
      where: { careRecipientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) =>
      MedicationAudit.rehydrate(row.id, {
        careRecipientId: row.careRecipientId,
        title: row.title,
        detail: row.detail,
        authorAdminId: row.authorAdminId,
        createdAt: row.createdAt,
      }),
    );
  }
}
