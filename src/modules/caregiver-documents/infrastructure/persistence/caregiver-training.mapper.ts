import {
  CaregiverTraining as PrismaCaregiverTraining,
  CaregiverTrainingStatus as PrismaTrainingStatus,
} from '@prisma/client';
import { CaregiverTraining } from '../../domain/caregiver-training.entity';
import { CaregiverTrainingStatus } from '../../domain/caregiver-training-status.enum';

const TO_DOMAIN_STATUS: Record<PrismaTrainingStatus, CaregiverTrainingStatus> = {
  COMPLETED: CaregiverTrainingStatus.Completed,
  IN_PROGRESS: CaregiverTrainingStatus.InProgress,
};

const TO_PERSISTENCE_STATUS: Record<CaregiverTrainingStatus, PrismaTrainingStatus> = {
  [CaregiverTrainingStatus.Completed]: 'COMPLETED',
  [CaregiverTrainingStatus.InProgress]: 'IN_PROGRESS',
};

/** Translates between the Prisma CaregiverTraining row and the aggregate. */
export class CaregiverTrainingMapper {
  static toDomain(row: PrismaCaregiverTraining): CaregiverTraining {
    return CaregiverTraining.rehydrate(row.id, {
      caregiverId: row.caregiverId,
      name: row.name,
      status: TO_DOMAIN_STATUS[row.status],
      completedAt: row.completedAt,
      certificate: row.certificate,
      hoursCompleted: row.hoursCompleted,
      hoursRequired: row.hoursRequired,
      documentKey: row.documentKey,
      fileName: row.fileName,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(training: CaregiverTraining): Omit<PrismaCaregiverTraining, 'updatedAt'> {
    return {
      id: training.id,
      caregiverId: training.caregiverId,
      name: training.name,
      status: TO_PERSISTENCE_STATUS[training.status],
      completedAt: training.completedAt,
      certificate: training.certificate,
      hoursCompleted: training.hoursCompleted,
      hoursRequired: training.hoursRequired,
      documentKey: training.documentKey,
      fileName: training.fileName,
      uploadedBy: training.uploadedBy,
      createdAt: training.createdAt,
    };
  }
}
