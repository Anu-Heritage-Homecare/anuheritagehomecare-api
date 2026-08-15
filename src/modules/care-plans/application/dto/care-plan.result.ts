import { Currency } from '@shared/domain/currency.enum';
import { BillingModel } from '../../domain/billing-model.enum';
import { CarePlan } from '../../domain/care-plan.entity';
import { CarePlanType } from '../../domain/care-plan-type.enum';

export interface CarePlanPriceResult {
  currency: Currency;
  unitAmountMinor: number;
  serviceFeeMinor: number;
}

/** Flat projection of a plan with its price in the caller's currency. */
export interface CarePlanResult {
  id: string;
  type: CarePlanType;
  name: string;
  description: string;
  billingModel: BillingModel;
  allowedHours: number[];
  price: CarePlanPriceResult | null;
}

export function toCarePlanResult(plan: CarePlan, currency: Currency): CarePlanResult {
  const price = plan.priceFor(currency);
  return {
    id: plan.id,
    type: plan.type,
    name: plan.name,
    description: plan.description,
    billingModel: plan.billingModel,
    allowedHours: plan.allowedHours,
    price:
      price === null
        ? null
        : {
            currency: price.currency,
            unitAmountMinor: price.unitAmount.amountMinor,
            serviceFeeMinor: price.serviceFee.amountMinor,
          },
  };
}
