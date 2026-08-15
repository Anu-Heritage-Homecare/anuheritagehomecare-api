import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CareRecipient } from '../../domain/care-recipient.entity';
import { CareRecipientRepository } from '../../domain/care-recipient.repository';
import { CareRecipientMapper } from './care-recipient.mapper';

/**
 * Prisma backed adapter for the CareRecipientRepository port. The only class in
 * the module that talks to the database for care recipients. `save` upserts so it
 * handles both new drafts and updates to existing aggregates idempotently.
 */
@Injectable()
export class CareRecipientPrismaRepository implements CareRecipientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(recipient: CareRecipient): Promise<void> {
    const row = CareRecipientMapper.toPersistence(recipient);
    await this.prisma.careRecipient.upsert({
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
        careNeeds: row.careNeeds,
        medicalConditions: row.medicalConditions,
        allergies: row.allergies,
        needsMedicationHelp: row.needsMedicationHelp,
        medications: row.medications,
        careFrequency: row.careFrequency,
        estimatedStartDate: row.estimatedStartDate,
        expectedDuration: row.expectedDuration,
        completedAt: row.completedAt,
        updatedAt: row.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<CareRecipient | null> {
    const row = await this.prisma.careRecipient.findUnique({ where: { id } });
    return row ? CareRecipientMapper.toDomain(row) : null;
  }

  async listByOwner(ownerId: string): Promise<CareRecipient[]> {
    const rows = await this.prisma.careRecipient.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => CareRecipientMapper.toDomain(row));
  }
}
