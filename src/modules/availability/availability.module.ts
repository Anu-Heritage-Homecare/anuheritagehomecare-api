import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VisitsModule } from '@modules/visits/visits.module';
import { BOOKED_SLOTS_DIRECTORY } from './application/ports/booked-slots.directory';
import { CAREGIVER_AVAILABILITY_REPOSITORY } from './domain/caregiver-availability.repository';
import { GetAvailabilityForDayUseCase } from './application/use-cases/get-availability-for-day.use-case';
import { GetCaregiverAvailabilityUseCase } from './application/use-cases/get-caregiver-availability.use-case';
import { SetCaregiverAvailabilityUseCase } from './application/use-cases/set-caregiver-availability.use-case';
import { VisitsBookedSlotsDirectory } from './infrastructure/access/visits-booked-slots.directory';
import { CaregiverAvailabilityPrismaRepository } from './infrastructure/persistence/caregiver-availability-prisma.repository';
import { CaregiverAvailabilityController } from './presentation/caregiver-availability.controller';

/**
 * Availability bounded context composition root. The availability repository is
 * bound to its Prisma adapter; the clock and id generator come from the global
 * shared module.
 */
@Module({
  imports: [PassportModule, VisitsModule],
  controllers: [CaregiverAvailabilityController],
  providers: [
    GetCaregiverAvailabilityUseCase,
    GetAvailabilityForDayUseCase,
    SetCaregiverAvailabilityUseCase,
    { provide: CAREGIVER_AVAILABILITY_REPOSITORY, useClass: CaregiverAvailabilityPrismaRepository },
    { provide: BOOKED_SLOTS_DIRECTORY, useClass: VisitsBookedSlotsDirectory },
  ],
})
export class AvailabilityModule {}
