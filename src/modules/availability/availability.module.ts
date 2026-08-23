import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CAREGIVER_AVAILABILITY_REPOSITORY } from './domain/caregiver-availability.repository';
import { GetCaregiverAvailabilityUseCase } from './application/use-cases/get-caregiver-availability.use-case';
import { SetCaregiverAvailabilityUseCase } from './application/use-cases/set-caregiver-availability.use-case';
import { CaregiverAvailabilityPrismaRepository } from './infrastructure/persistence/caregiver-availability-prisma.repository';
import { CaregiverAvailabilityController } from './presentation/caregiver-availability.controller';

/**
 * Availability bounded context composition root. The availability repository is
 * bound to its Prisma adapter; the clock and id generator come from the global
 * shared module.
 */
@Module({
  imports: [PassportModule],
  controllers: [CaregiverAvailabilityController],
  providers: [
    GetCaregiverAvailabilityUseCase,
    SetCaregiverAvailabilityUseCase,
    { provide: CAREGIVER_AVAILABILITY_REPOSITORY, useClass: CaregiverAvailabilityPrismaRepository },
  ],
})
export class AvailabilityModule {}
