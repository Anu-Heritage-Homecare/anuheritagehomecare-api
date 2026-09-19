import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { SubscriptionCreatedEvent } from './events/subscription-created.event';
import { SubscriptionStatus } from './subscription-status.enum';

interface SubscriptionProps {
  ownerId: string;
  careRecipientId: string;
  planType: CarePlanType;
  startDate: Date;
  monthlyPrice: Money;
  status: SubscriptionStatus;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription aggregate: a recurring monthly engagement for a care recipient on
 * the Standard, Premium or Live in plans. Created awaiting the first payment; a
 * successful charge activates it. The monthly price is snapshotted at creation.
 */
export class Subscription extends AggregateRoot<string> {
  private props: SubscriptionProps;

  private constructor(id: string, props: SubscriptionProps) {
    super(id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    ownerId: string;
    careRecipientId: string;
    planType: CarePlanType;
    startDate: Date;
    monthlyPrice: Money;
    now: Date;
  }): Subscription {
    if (params.planType === CarePlanType.Flexible) {
      throw new ValidationException('The Flexible plan is booked by the hour, not subscribed to');
    }
    const subscription = new Subscription(params.id, {
      ownerId: params.ownerId,
      careRecipientId: params.careRecipientId,
      planType: params.planType,
      startDate: params.startDate,
      monthlyPrice: params.monthlyPrice,
      status: SubscriptionStatus.PendingPayment,
      autoRenew: true,
      createdAt: params.now,
      updatedAt: params.now,
    });
    subscription.addDomainEvent(new SubscriptionCreatedEvent(params.id, params.ownerId));
    return subscription;
  }

  public static rehydrate(id: string, props: SubscriptionProps): Subscription {
    return new Subscription(id, props);
  }

  /**
   * Change the plan tier of the subscription (an upgrade or downgrade). The new
   * monthly price is snapshotted. A cancelled subscription cannot change plan, and
   * the Flexible plan is hourly rather than a subscription tier.
   */
  public changePlan(planType: CarePlanType, monthlyPrice: Money, now: Date): void {
    if (this.props.status === SubscriptionStatus.Cancelled) {
      throw new ValidationException('A cancelled subscription cannot change plan');
    }
    if (planType === CarePlanType.Flexible) {
      throw new ValidationException('The Flexible plan is booked by the hour, not subscribed to');
    }
    if (monthlyPrice.currency !== this.props.monthlyPrice.currency) {
      throw new ValidationException('The new plan price must be in the same currency');
    }
    this.props.planType = planType;
    this.props.monthlyPrice = monthlyPrice;
    this.props.updatedAt = now;
  }

  /** Activate once the first payment has succeeded. */
  public activate(now: Date): void {
    if (this.props.status === SubscriptionStatus.Cancelled) {
      throw new ValidationException('A cancelled subscription cannot be activated');
    }
    this.props.status = SubscriptionStatus.Active;
    this.props.updatedAt = now;
  }

  public markPastDue(now: Date): void {
    if (this.props.status === SubscriptionStatus.Active) {
      this.props.status = SubscriptionStatus.PastDue;
      this.props.updatedAt = now;
    }
  }

  /** Pause an active subscription; a cancelled one cannot be paused. */
  public pause(now: Date): void {
    if (this.props.status === SubscriptionStatus.Cancelled) {
      throw new ValidationException('A cancelled subscription cannot be paused');
    }
    this.props.status = SubscriptionStatus.Paused;
    this.props.updatedAt = now;
  }

  /** Resume a paused subscription back to active. */
  public resume(now: Date): void {
    if (this.props.status !== SubscriptionStatus.Paused) {
      throw new ValidationException('Only a paused subscription can be resumed');
    }
    this.props.status = SubscriptionStatus.Active;
    this.props.updatedAt = now;
  }

  /** Turn automatic renewal on or off. */
  public setAutoRenew(autoRenew: boolean, now: Date): void {
    this.props.autoRenew = autoRenew;
    this.props.updatedAt = now;
  }

  public cancel(now: Date): void {
    this.props.status = SubscriptionStatus.Cancelled;
    this.props.updatedAt = now;
  }

  public get ownerId(): string {
    return this.props.ownerId;
  }

  public get careRecipientId(): string {
    return this.props.careRecipientId;
  }

  public get planType(): CarePlanType {
    return this.props.planType;
  }

  public get startDate(): Date {
    return this.props.startDate;
  }

  public get monthlyPrice(): Money {
    return this.props.monthlyPrice;
  }

  public get status(): SubscriptionStatus {
    return this.props.status;
  }

  public get autoRenew(): boolean {
    return this.props.autoRenew;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
