import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { GetPlansBillingOverviewUseCase } from './application/use-cases/get-plans-billing-overview.use-case';
import { PLANS_BILLING_READ_MODEL } from './application/ports/plans-billing-read.port';
import { PlansBillingReadPrisma } from './infrastructure/persistence/plans-billing-read.prisma';
import { AdminPlansBillingController } from './presentation/admin-plans-billing.controller';

/**
 * Admin Plans and Billing control panel. A read aggregator over the billing,
 * subscription, booking and care request tables; the care plan catalog supplies
 * plan names and prices. Separate admin auth applies at the controller.
 */
@Module({
  imports: [PassportModule, CarePlansModule],
  controllers: [AdminPlansBillingController],
  providers: [
    GetPlansBillingOverviewUseCase,
    { provide: PLANS_BILLING_READ_MODEL, useClass: PlansBillingReadPrisma },
  ],
})
export class AdminPlansBillingModule {}
