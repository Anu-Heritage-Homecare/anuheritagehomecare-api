import { AggregateRoot } from '@shared/domain/aggregate-root.base';
import { ValidationException } from '@shared/domain/domain-exception';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { BookingStatus } from './booking-status.enum';
import { BookingCreatedEvent } from './events/booking-created.event';
import { BookingPrice } from './value-objects/booking-price.vo';
import { TimeOfDay } from './value-objects/time-of-day.vo';

interface BookingProps {
  ownerId: string;
  careRecipientId: string;
  planType: CarePlanType;
  hours: number;
  serviceDate: Date;
  startTime: TimeOfDay;
  price: BookingPrice;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Booking aggregate: a single, one time Flexible (hourly) engagement for a care
 * recipient. Created awaiting payment; a successful charge confirms it. The price
 * is snapshotted at creation so later catalog changes never rewrite the order.
 */
export class Booking extends AggregateRoot<string> {
  private props: BookingProps;

  private constructor(id: string, props: BookingProps) {
    super(id);
    this.props = props;
  }

  public static createFlexible(params: {
    id: string;
    ownerId: string;
    careRecipientId: string;
    hours: number;
    serviceDate: Date;
    startTime: TimeOfDay;
    price: BookingPrice;
    now: Date;
  }): Booking {
    if (params.price.hours !== params.hours) {
      throw new ValidationException('Booking hours must match the priced hours');
    }
    const booking = new Booking(params.id, {
      ownerId: params.ownerId,
      careRecipientId: params.careRecipientId,
      planType: CarePlanType.Flexible,
      hours: params.hours,
      serviceDate: params.serviceDate,
      startTime: params.startTime,
      price: params.price,
      status: BookingStatus.PendingPayment,
      createdAt: params.now,
      updatedAt: params.now,
    });
    booking.addDomainEvent(new BookingCreatedEvent(params.id, params.ownerId));
    return booking;
  }

  public static rehydrate(id: string, props: BookingProps): Booking {
    return new Booking(id, props);
  }

  /** Confirm the booking once payment has succeeded. */
  public confirm(now: Date): void {
    if (this.props.status === BookingStatus.Cancelled) {
      throw new ValidationException('A cancelled booking cannot be confirmed');
    }
    this.props.status = BookingStatus.Confirmed;
    this.props.updatedAt = now;
  }

  /** Cancel the booking (for example when payment is abandoned or refunded). */
  public cancel(now: Date): void {
    this.props.status = BookingStatus.Cancelled;
    this.props.updatedAt = now;
  }

  /** End time in minutes from midnight of the service date; may exceed a day. */
  public get endMinute(): number {
    return this.props.startTime.minutes + this.props.hours * 60;
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

  public get hours(): number {
    return this.props.hours;
  }

  public get serviceDate(): Date {
    return this.props.serviceDate;
  }

  public get startTime(): TimeOfDay {
    return this.props.startTime;
  }

  public get price(): BookingPrice {
    return this.props.price;
  }

  public get status(): BookingStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
