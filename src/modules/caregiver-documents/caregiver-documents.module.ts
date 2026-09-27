import { Module } from '@nestjs/common';
import { CAREGIVER_DOCUMENT_REPOSITORY } from './domain/caregiver-document.repository';
import { CAREGIVER_TRAINING_REPOSITORY } from './domain/caregiver-training.repository';
import { CaregiverDocumentPrismaRepository } from './infrastructure/persistence/caregiver-document-prisma.repository';
import { CaregiverTrainingPrismaRepository } from './infrastructure/persistence/caregiver-training-prisma.repository';

/**
 * Caregiver documents bounded context composition root. Holds the employment
 * document and training record aggregates and binds their repositories, exported so
 * the admin Caregivers screen can compose and capture the Documents tab. The stored
 * file is an opaque documentKey; blob storage and downloads are deferred.
 */
@Module({
  providers: [
    { provide: CAREGIVER_DOCUMENT_REPOSITORY, useClass: CaregiverDocumentPrismaRepository },
    { provide: CAREGIVER_TRAINING_REPOSITORY, useClass: CaregiverTrainingPrismaRepository },
  ],
  exports: [CAREGIVER_DOCUMENT_REPOSITORY, CAREGIVER_TRAINING_REPOSITORY],
})
export class CaregiverDocumentsModule {}
