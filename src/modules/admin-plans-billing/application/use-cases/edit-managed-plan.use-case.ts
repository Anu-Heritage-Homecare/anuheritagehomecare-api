import { Inject, Injectable } from '@nestjs/common';
import {
  ManagedPlanPriceEntry,
  PlanLifecycle,
  PlanOverview,
  ServiceItem,
  VolumeDiscount,
} from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import {
  MANAGED_CARE_PLAN_REPOSITORY,
  ManagedCarePlanRepository,
} from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { ManagedPlanStatus } from '@modules/admin-care-plans/domain/managed-plan-status.enum';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

export type EditManagedPlanCommand = { planId: string; adminId: string } & (
  | { section: 'GENERAL'; overview: PlanOverview }
  | { section: 'PRICING'; prices: ManagedPlanPriceEntry[] }
  | { section: 'SERVICES'; services: ServiceItem[] }
  | { section: 'VOLUME_DISCOUNTS'; discounts: VolumeDiscount[] }
  | { section: 'COVERAGE'; coverageAreas: string[] }
  | { section: 'ELIGIBILITY'; eligibilityRules: string[] }
  | { section: 'LIFECYCLE'; lifecycle: PlanLifecycle }
  | { section: 'STATUS'; status: ManagedPlanStatus }
);

/**
 * Edit one section of a managed care plan's configuration. Every section change is
 * recorded as a new version on the aggregate. Pushing a core plan's pricing change
 * to the live checkout catalogue is a separate publish step and is deferred.
 */
@Injectable()
export class EditManagedPlanUseCase {
  constructor(
    @Inject(MANAGED_CARE_PLAN_REPOSITORY) private readonly plans: ManagedCarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: EditManagedPlanCommand): Promise<void> {
    const plan = await this.plans.findById(command.planId);
    if (plan === null) {
      throw new NotFoundDomainException('Care plan not found');
    }
    const now = this.clock.now();
    const adminId = command.adminId;

    switch (command.section) {
      case 'GENERAL':
        plan.reviseOverview(command.overview, adminId, now);
        break;
      case 'PRICING':
        plan.revisePricing(command.prices, adminId, now);
        break;
      case 'SERVICES':
        plan.setServices(command.services, adminId, now);
        break;
      case 'VOLUME_DISCOUNTS':
        plan.setVolumeDiscounts(command.discounts, adminId, now);
        break;
      case 'COVERAGE':
        plan.setCoverageAreas(command.coverageAreas, adminId, now);
        break;
      case 'ELIGIBILITY':
        plan.setEligibilityRules(command.eligibilityRules, adminId, now);
        break;
      case 'LIFECYCLE':
        plan.reviseLifecycle(command.lifecycle, adminId, now);
        break;
      case 'STATUS':
        if (command.status === ManagedPlanStatus.Archived) {
          plan.archive(adminId, now);
        } else {
          plan.activate(adminId, now);
        }
        break;
    }

    await this.plans.save(plan);
  }
}
