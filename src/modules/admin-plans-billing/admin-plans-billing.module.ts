import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminCarePlansModule } from '@modules/admin-care-plans/admin-care-plans.module';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { CarePlansModule } from '@modules/care-plans/care-plans.module';
import { CareRequestsModule } from '@modules/care-requests/care-requests.module';
import { ClientOnboardingModule } from '@modules/client-onboarding/client-onboarding.module';
import { AdvanceApplicationStageUseCase } from './application/use-cases/advance-application-stage.use-case';
import { ApproveCareRequestUseCase } from './application/use-cases/approve-care-request.use-case';
import { AssignApplicationCoordinatorUseCase } from './application/use-cases/assign-application-coordinator.use-case';
import { BulkUpdateApplicationsUseCase } from './application/use-cases/bulk-update-applications.use-case';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case';
import { ChangeSubscriptionPlanUseCase } from './application/use-cases/change-subscription-plan.use-case';
import { CreateManagedPlanUseCase } from './application/use-cases/create-managed-plan.use-case';
import { DeclineCareRequestUseCase } from './application/use-cases/decline-care-request.use-case';
import { EditManagedPlanUseCase } from './application/use-cases/edit-managed-plan.use-case';
import { GetApplicationDetailUseCase } from './application/use-cases/get-application-detail.use-case';
import { GetManagedPlanDetailUseCase } from './application/use-cases/get-managed-plan-detail.use-case';
import { GetOnboardingPipelineUseCase } from './application/use-cases/get-onboarding-pipeline.use-case';
import { ListManagedPlansUseCase } from './application/use-cases/list-managed-plans.use-case';
import { GetOperationalAlertsUseCase } from './application/use-cases/get-operational-alerts.use-case';
import { GetOperationsPanelUseCase } from './application/use-cases/get-operations-panel.use-case';
import { GetSubscriptionKpisUseCase } from './application/use-cases/get-subscription-kpis.use-case';
import { ListEnrichedSubscriptionsUseCase } from './application/use-cases/list-enriched-subscriptions.use-case';
import { GetPlanPerformanceUseCase } from './application/use-cases/get-plan-performance.use-case';
import { GetPlansBillingOverviewUseCase } from './application/use-cases/get-plans-billing-overview.use-case';
import { GetRenewalsTimelineUseCase } from './application/use-cases/get-renewals-timeline.use-case';
import { GetSubscriptionStatusUseCase } from './application/use-cases/get-subscription-status.use-case';
import { ListApplicationsUseCase } from './application/use-cases/list-applications.use-case';
import { ListCareRequestsUseCase } from './application/use-cases/list-care-requests.use-case';
import { ListPlanSubscriptionsUseCase } from './application/use-cases/list-plan-subscriptions.use-case';
import { ListTransactionsUseCase } from './application/use-cases/list-transactions.use-case';
import { SetApplicationStatusUseCase } from './application/use-cases/set-application-status.use-case';
import { CARE_REQUESTS_READ_MODEL } from './application/ports/care-requests-read.port';
import { FLEXIBLE_HOURS_READ_MODEL } from './application/ports/flexible-hours-read.port';
import { ONBOARDING_READ_MODEL } from './application/ports/onboarding-read.port';
import { OPERATIONAL_ALERTS_READ_MODEL } from './application/ports/operational-alerts-read.port';
import { PLAN_PERFORMANCE_READ_MODEL } from './application/ports/plan-performance-read.port';
import { PLANS_BILLING_READ_MODEL } from './application/ports/plans-billing-read.port';
import { SUBSCRIPTION_STATUS_READ_MODEL } from './application/ports/subscription-status-read.port';
import { SUBSCRIPTIONS_ADMIN_READ_MODEL } from './application/ports/subscriptions-admin-read.port';
import { TRANSACTIONS_READ_MODEL } from './application/ports/transactions-read.port';
import { OnboardingReadPrisma } from './infrastructure/persistence/onboarding-read.prisma';
import { SubscriptionsAdminReadPrisma } from './infrastructure/persistence/subscriptions-admin-read.prisma';
import { PlansBillingReadPrisma } from './infrastructure/persistence/plans-billing-read.prisma';
import { AdminPlansBillingController } from './presentation/admin-plans-billing.controller';

/**
 * Admin Plans and Billing control panel. A read aggregator over the billing,
 * subscription, booking and care request tables; the care plan catalog supplies
 * plan names and prices. Separate admin auth applies at the controller.
 */
@Module({
  imports: [
    PassportModule,
    CarePlansModule,
    BookingsModule,
    CareRequestsModule,
    ClientOnboardingModule,
    AdminCarePlansModule,
  ],
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
    GetOperationsPanelUseCase,
    GetOnboardingPipelineUseCase,
    ListApplicationsUseCase,
    GetApplicationDetailUseCase,
    AssignApplicationCoordinatorUseCase,
    SetApplicationStatusUseCase,
    AdvanceApplicationStageUseCase,
    BulkUpdateApplicationsUseCase,
    GetSubscriptionStatusUseCase,
    GetPlanPerformanceUseCase,
    GetOperationalAlertsUseCase,
    ListManagedPlansUseCase,
    GetManagedPlanDetailUseCase,
    CreateManagedPlanUseCase,
    EditManagedPlanUseCase,
    ListEnrichedSubscriptionsUseCase,
    GetSubscriptionKpisUseCase,
    // One Prisma read class backs the billing read ports on this panel.
    PlansBillingReadPrisma,
    { provide: PLANS_BILLING_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: TRANSACTIONS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: CARE_REQUESTS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: FLEXIBLE_HOURS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: SUBSCRIPTION_STATUS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: PLAN_PERFORMANCE_READ_MODEL, useExisting: PlansBillingReadPrisma },
    { provide: OPERATIONAL_ALERTS_READ_MODEL, useExisting: PlansBillingReadPrisma },
    // The onboarding read model backs the pipeline and verification queue.
    { provide: ONBOARDING_READ_MODEL, useClass: OnboardingReadPrisma },
    // The subscriptions admin read backs the enriched table and KPI bar.
    { provide: SUBSCRIPTIONS_ADMIN_READ_MODEL, useClass: SubscriptionsAdminReadPrisma },
  ],
})
export class AdminPlansBillingModule {}
