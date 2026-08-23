import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareRecipient } from '../../domain/care-recipient.entity';
import { CareRecipientRepository } from '../../domain/care-recipient.repository';
import { CareRecipientMapper } from './care-recipient.mapper';

/**
 * Prisma backed adapter for the CareRecipientRepository port. The only class in
 * the module that talks to the database for care recipients. `save` upserts the
 * recipient and replaces its medication schedule wholesale inside a transaction,
 * since medications are owned by the aggregate. Reads eager load the medications.
 */
@Injectable()
export class CareRecipientPrismaRepository implements CareRecipientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(recipient: CareRecipient): Promise<void> {
    const row = CareRecipientMapper.toPersistence(recipient);
    const medications = CareRecipientMapper.toMedicationRows(recipient);

    await this.prisma.$transaction([
      this.prisma.careRecipient.upsert({
        where: { id: row.id },
        create: row,
        update: {
          status: row.status,
          onboardingStep: row.onboardingStep,
          name: row.name,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth,
          city: row.city,
          state: row.state,
          fullAddress: row.fullAddress,
          relationship: row.relationship,
          livingSituation: row.livingSituation,
          photoKey: row.photoKey,
          latitude: row.latitude,
          longitude: row.longitude,
          careNeeds: row.careNeeds,
          medicalConditions: row.medicalConditions,
          allergies: row.allergies,
          needsMedicationHelp: row.needsMedicationHelp,
          careFrequency: row.careFrequency,
          estimatedStartDate: row.estimatedStartDate,
          expectedDuration: row.expectedDuration,
          completedAt: row.completedAt,
          updatedAt: row.updatedAt,
        },
      }),
      this.prisma.medication.deleteMany({ where: { careRecipientId: row.id } }),
      this.prisma.medication.createMany({
        data: medications.map((medication) => ({ ...medication, careRecipientId: row.id })),
      }),
    ]);
  }

  async findById(id: string): Promise<CareRecipient | null> {
    const row = await this.prisma.careRecipient.findUnique({
      where: { id },
      include: { medications: true },
    });
    return row ? CareRecipientMapper.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<CareRecipient[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.careRecipient.findMany({
      where: { id: { in: ids } },
      include: { medications: true },
    });
    return rows.map((row) => CareRecipientMapper.toDomain(row));
  }

  async listByOwner(ownerId: string): Promise<CareRecipient[]> {
    const rows = await this.prisma.careRecipient.findMany({
      where: { ownerId },
      include: { medications: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => CareRecipientMapper.toDomain(row));
  }
}
