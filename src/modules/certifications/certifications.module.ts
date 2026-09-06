import { Module } from '@nestjs/common';
import { CERTIFICATION_REPOSITORY } from './domain/certification.repository';
import { CertificationPrismaRepository } from './infrastructure/persistence/certification-prisma.repository';

/**
 * Certifications bounded context composition root. A read model for now: the
 * repository is bound and exported so the dashboard's certification watch can list
 * expiring credentials. The management surface (the Caregivers screen) is built
 * later and will add its own use cases and controller here.
 */
@Module({
  providers: [{ provide: CERTIFICATION_REPOSITORY, useClass: CertificationPrismaRepository }],
  exports: [CERTIFICATION_REPOSITORY],
})
export class CertificationsModule {}
