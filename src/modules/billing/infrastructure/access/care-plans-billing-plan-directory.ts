import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { BillingPlanDirectory } from '../../application/ports/billing-directories.port';

/** Adapts the care plans catalog to the billing plan port. */
@Injectable()
export class CarePlansBillingPlanDirectory implements BillingPlanDirectory {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async nameForType(planType: string): Promise<string | null> {
    const type = Object.values(CarePlanType).find((value) => String(value) === planType);
    if (type === undefined) {
      return null;
    }
    const plan = await this.plans.findByType(type);
    return plan === null ? null : plan.name;
  }
}
