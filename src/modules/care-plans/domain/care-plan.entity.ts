import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Entity } from '@shared/domain/entity.base';
import { BillingModel } from './billing-model.enum';
import { CarePlanType } from './care-plan-type.enum';
import { CarePlanPrice } from './value-objects/care-plan-price.vo';

interface CarePlanProps {
  type: CarePlanType;
  name: string;
  description: string;
  billingModel: BillingModel;
  allowedHours: number[];
  active: boolean;
  prices: CarePlanPrice[];
}

/**
 * A care plan from the catalog. Reference data owned by this context: the four
 * plans, how each is billed, the hour options for the hourly plan, and the price
 * in each supported currency. Booking and subscription snapshot the relevant
 * price at purchase time so later catalog changes never rewrite past orders.
 */
export class CarePlan extends Entity<string> {
  private readonly props: CarePlanProps;

  private constructor(id: string, props: CarePlanProps) {
    super(id);
    this.props = props;
  }

  public static rehydrate(id: string, props: CarePlanProps): CarePlan {
    return new CarePlan(id, props);
  }

  public get type(): CarePlanType {
    return this.props.type;
  }

  public get name(): string {
    return this.props.name;
  }

  public get description(): string {
    return this.props.description;
  }

  public get billingModel(): BillingModel {
    return this.props.billingModel;
  }

  public get isHourly(): boolean {
    return this.props.billingModel === BillingModel.Hourly;
  }

  public get allowedHours(): number[] {
    return [...this.props.allowedHours];
  }

  public get active(): boolean {
    return this.props.active;
  }

  public get prices(): CarePlanPrice[] {
    return [...this.props.prices];
  }

  /** The price in a currency, or null when the plan is not offered in it. */
  public priceFor(currency: Currency): CarePlanPrice | null {
    return this.props.prices.find((price) => price.currency === currency) ?? null;
  }

  /** Assert an hours choice is valid for this hourly plan. */
  public assertHoursAllowed(hours: number): void {
    if (!this.isHourly) {
      throw new ValidationException('This plan is not booked by the hour');
    }
    if (!this.props.allowedHours.includes(hours)) {
      throw new ValidationException(`This plan does not offer ${hours} hour bookings`);
    }
  }
}
