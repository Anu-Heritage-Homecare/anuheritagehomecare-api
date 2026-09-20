import { Module } from '@nestjs/common';
import { CAREGIVER_PROFILE_REPOSITORY } from './domain/caregiver-profile.repository';
import { CaregiverProfilePrismaRepository } from './infrastructure/persistence/caregiver-profile-prisma.repository';

/**
 * Caregiver profile bounded context: the admin operational overlay behind the
 * Caregivers screen. The repository is exported so the admin caregivers panel can
 * read and drive the profiles.
 */
@Module({
  providers: [
    { provide: CAREGIVER_PROFILE_REPOSITORY, useClass: CaregiverProfilePrismaRepository },
  ],
  exports: [CAREGIVER_PROFILE_REPOSITORY],
})
export class CaregiverProfileModule {}
