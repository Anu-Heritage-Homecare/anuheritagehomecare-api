import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { CareRequestsModule } from '@modules/care-requests/care-requests.module';
import { ApproveCareRequestUseCase } from './application/use-cases/approve-care-request.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ChangeSubscriptionPlanUseCase } from './application/use-cases/change-subscription-plan.use-case';
import { DeclineCareRequestUseCase } from './application/use-cases/decline-care-request.use-case';
import { GetPlansBillingOverviewUseCase } from './application/use-cases/get-plans-billing-overview.use-case';
import { GetRenewalsTimelineUseCase } from './application/use-cases/get-renewals-timeline.use-case';
import { ListCareRequestsUseCase } from './application/use-cases/list-care-requests.use-case';
import { ListPlanSubscriptionsUseCase } from './application/use-cases/list-plan-subscriptions.use-case';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.use-case';
import { CARE_REQUESTS_READ_MODEL } from './application/ports/care-requests-read.port';
import { PLANS_BILLING_READ_MODEL } from './application/ports/plans-billing-read.port';
import { TRANSACTIONS_READ_MODEL } from './application/ports/transactions-read.port';
import { PlansBillingReadPrisma } from './infrastructure/persistence/plans-billing-read.prisma';
import { AdminPlansBillingController } from './presentation/admin-plans-billing.controller';

/**
 * Admin Plans and Billing control panel. A read aggregator over the billing,
 * subscription, booking and care request tables; the care plan catalog supplies
 * plan names and prices. Separate admin auth applies at the controller.
 */
@Module({
  imports: [PassportModule, CarePlansModule, BookingsModule, CareRequestsModule],
  controllers: [AdminPlansBillingController],
  providers: [
    GetPlansBillingOverviewUseCase,
    ListPlanSubscriptionsUseCase,
    ChangeSubscriptionPlanUseCase,
    CancelSubscriptionUseCase,
    ListTransactionsUseCase,
    GetRenewalsTimelineUseCase,
    ListCareRequestsUseCase,
    ApproveCareRequestUseCase,
    DeclineCareRequestUseCase,
    // One Prisma read class backs every read port on this panel.
    PlansBillingReadPrisma,
    { provide: PLANS_BILLING_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: TRANSACTIONS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: CARE_REQUESTS_READ_MODEL, useExisting: PlansBillingReadPrisma },
  ],
})
export class AdminPlansBillingModule {}
