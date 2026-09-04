import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  BillingPlanDirectory,
  BillingPlanPriceView,
} from '../../application/ports/billing-directories.port';

/** Adapts the care plans catalog to the billing plan port. */
@Injectable()
export class CarePlansBillingPlanDirectory implements BillingPlanDirectory {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async nameForType(planType: string): Promise<string | null> {
    const type = CarePlansBillingPlanDirectory.toType(planType);
    if (type === undefined) {
      return null;
    }
    const plan = await this.plans.findByType(type);
    return plan === null ? null : plan.name;
  }

  async priceForType(planType: string, currency: string): Promise<BillingPlanPriceView | null> {
    const type = CarePlansBillingPlanDirectory.toType(planType);
    const money = Object.values(Currency).find((value) => String(value) === currency);
    if (type === undefined || money === undefined) {
      return null;
    }
    const plan = await this.plans.findByType(type);
    const price = plan?.priceFor(money) ?? null;
    if (price === null) {
      return null;
    }
    return {
      monthlyPriceMinor: price.unitAmount.amountMinor,
      stripePriceId: price.stripePriceId,
      paystackPlanCode: price.paystackPlanCode,
    };
  }

  private static toType(planType: string): CarePlanType | undefined {
    return Object.values(CarePlanType).find((value) => String(value) === planType);
  }
}
