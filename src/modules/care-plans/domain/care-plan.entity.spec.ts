import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { BillingModel } from './billing-model.enum';
import { CarePlan } from './care-plan.entity';
import { CarePlanType } from './care-plan-type.enum';
import { CarePlanPrice } from './value-objects/care-plan-price.vo';

function flexiblePlan(): CarePlan {
  return CarePlan.rehydrate('plan-1', {
    type: CarePlanType.Flexible,
    name: 'Flexible Plan',
    description: 'Pay only for the hours you need.',
    billingModel: BillingModel.Hourly,
    allowedHours: [3, 4, 6],
    active: true,
    prices: [
      CarePlanPrice.create(
        Currency.UnitedStatesDollar,
        Money.fromMinor(3000, Currency.UnitedStatesDollar),
        Money.fromMinor(1000, Currency.UnitedStatesDollar),
      ),
    ],
  });
}

describe('CarePlan', () => {
  it('returns the price for a supported currency and null otherwise', () => {
    const plan = flexiblePlan();

    expect(plan.priceFor(Currency.UnitedStatesDollar)?.unitAmount.amountMinor).toBe(3000);
    expect(plan.priceFor(Currency.NigerianNaira)).toBeNull();
  });

  it('accepts an allowed hours choice and rejects others', () => {
    const plan = flexiblePlan();

    expect(() => plan.assertHoursAllowed(6)).not.toThrow();
    expect(() => plan.assertHoursAllowed(5)).toThrow(ValidationException);
  });
});
