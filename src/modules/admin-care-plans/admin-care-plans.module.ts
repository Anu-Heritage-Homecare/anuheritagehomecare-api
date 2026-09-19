import { Module } from '@nestjs/common';
import { MANAGED_CARE_PLAN_REPOSITORY } from './domain/managed-care-plan.repository';
import { ManagedCarePlanPrismaRepository } from './infrastructure/persistence/managed-care-plan-prisma.repository';

/**
 * Admin care plan management bounded context: the editable configuration catalogue
 * behind the Plans and Billing Care Plans screen. The repository is exported so the
 * plans panel can read and drive the managed plans.
 */
@Module({
  providers: [{ provide: MANAGED_CARE_PLAN_REPOSITORY, useClass: ManagedCarePlanPrismaRepository }],
  exports: [MANAGED_CARE_PLAN_REPOSITORY],
})
export class AdminCarePlansModule {}
