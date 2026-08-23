import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { VisitsModule } from '@modules/visits/visits.module';
import { CAREGIVER_PAY_RATE_REPOSITORY } from './domain/caregiver-pay-rate.repository';
import { CAREGIVER_TIMESHEET_DIRECTORY } from './application/ports/caregiver-timesheet.port';
import { GetCurrentEarningsUseCase } from './application/use-cases/get-current-earnings.use-case';
import { VisitsCaregiverTimesheet } from './infrastructure/access/visits-caregiver-timesheet';
import { CaregiverPayRatePrismaRepository } from './infrastructure/persistence/caregiver-pay-rate-prisma.repository';
import { CaregiverEarningsController } from './presentation/caregiver-earnings.controller';

/**
 * Earnings bounded context composition root. The pay rate repository is bound to
 * its Prisma adapter, and the timesheet read is bound to an adapter that delegates
 * to the visits context through its exported repository token.
 */
@Module({
  imports: [PassportModule, VisitsModule],
  controllers: [CaregiverEarningsController],
  providers: [
    GetCurrentEarningsUseCase,
    { provide: CAREGIVER_PAY_RATE_REPOSITORY, useClass: CaregiverPayRatePrismaRepository },
    { provide: CAREGIVER_TIMESHEET_DIRECTORY, useClass: VisitsCaregiverTimesheet },
  ],
})
export class EarningsModule {}
