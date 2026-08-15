import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GetCarePlanUseCase } from './application/use-cases/get-care-plan.use-case';
import { ListCarePlansUseCase } from './application/use-cases/list-care-plans.use-case';
import { CARE_PLAN_REPOSITORY } from './domain/care-plan.repository';
import { CarePlanPrismaRepository } from './infrastructure/persistence/care-plan-prisma.repository';
import { CarePlansController } from './presentation/care-plans.controller';

/**
 * Care plans catalog composition root. The repository port is bound to its
 * Prisma adapter and exported so downstream contexts (bookings, subscriptions)
 * can price against the same catalog without duplicating it.
 */
@Module({
  imports: [PassportModule],
  controllers: [CarePlansController],
  providers: [
    ListCarePlansUseCase,
    GetCarePlanUseCase,
    { provide: CARE_PLAN_REPOSITORY, useClass: CarePlanPrismaRepository },
  ],
  exports: [CARE_PLAN_REPOSITORY],
})
export class CarePlansModule {}
