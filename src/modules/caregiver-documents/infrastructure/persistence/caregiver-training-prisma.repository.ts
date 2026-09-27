import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaregiverTraining } from '../../domain/caregiver-training.entity';
import { CaregiverTrainingRepository } from '../../domain/caregiver-training.repository';
import { CaregiverTrainingMapper } from './caregiver-training.mapper';

/** Prisma backed adapter for the CaregiverTrainingRepository port. */
@Injectable()
export class CaregiverTrainingPrismaRepository implements CaregiverTrainingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(training: CaregiverTraining): Promise<void> {
    const row = CaregiverTrainingMapper.toPersistence(training);
    await this.prisma.caregiverTraining.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        status: row.status,
        completedAt: row.completedAt,
        certificate: row.certificate,
        hoursCompleted: row.hoursCompleted,
        hoursRequired: row.hoursRequired,
        documentKey: row.documentKey,
        fileName: row.fileName,
        uploadedBy: row.uploadedBy,
      },
    });
  }

  async findById(id: string): Promise<CaregiverTraining | null> {
    const row = await this.prisma.caregiverTraining.findUnique({ where: { id } });
    return row === null ? null : CaregiverTrainingMapper.toDomain(row);
  }

  async listForCaregiver(caregiverId: string): Promise<CaregiverTraining[]> {
    const rows = await this.prisma.caregiverTraining.findMany({
      where: { caregiverId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => CaregiverTrainingMapper.toDomain(row));
  }
}
