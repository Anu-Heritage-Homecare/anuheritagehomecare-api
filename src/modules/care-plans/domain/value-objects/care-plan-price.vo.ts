import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { ValueObject } from '@shared/domain/value-object.base';

interface CarePlanPriceProps {
  currency: Currency;
  unitAmount: Money;
  serviceFee: Money;
  stripePriceId: string | null;
  paystackPlanCode: string | null;
}

/**
 * The price of a plan in one currency. `unitAmount` is the hourly rate for an
 * hourly plan or the monthly price for a monthly plan; `serviceFee` is the flat
 * per booking fee (zero where a plan has none). Both amounts must be in the same
 * currency as the price itself.
 */
export class CarePlanPrice extends ValueObject<CarePlanPriceProps> {
  private constructor(props: CarePlanPriceProps) {
    super(props);
  }

  public static create(
    currency: Currency,
    unitAmount: Money,
    serviceFee: Money,
    recurring: { stripePriceId?: string | null; paystackPlanCode?: string | null } = {},
  ): CarePlanPrice {
    if (unitAmount.currency !== currency || serviceFee.currency !== currency) {
      throw new Error('Care plan price amounts must match the price currency');
    }
    return new CarePlanPrice({
      currency,
      unitAmount,
      serviceFee,
      stripePriceId: recurring.stripePriceId ?? null,
      paystackPlanCode: recurring.paystackPlanCode ?? null,
    });
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get unitAmount(): Money {
    return this.props.unitAmount;
  }

  public get serviceFee(): Money {
    return this.props.serviceFee;
  }

  public get stripePriceId(): string | null {
    return this.props.stripePriceId;
  }

  public get paystackPlanCode(): string | null {
    return this.props.paystackPlanCode;
  }
}
