import { Currency } from '@shared/domain/currency.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Booking } from '../../domain/booking.entity';
import { BookingStatus } from '../../domain/booking-status.enum';
import { TimeOfDay } from '../../domain/value-objects/time-of-day.vo';

const MINUTES_IN_DAY = 24 * 60;

export interface BookingResult {
  id: string;
  ownerId: string;
  careRecipientId: string;
  planType: CarePlanType;
  status: BookingStatus;
  hours: number;
  serviceDate: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  price: {
    currency: Currency;
    hourlyRateMinor: number;
    subtotalMinor: number;
    serviceFeeMinor: number;
    totalMinor: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function toBookingResult(booking: Booking): BookingResult {
  const price = booking.price;
  const endMinute = booking.endMinute;
  return {
    id: booking.id,
    ownerId: booking.ownerId,
    careRecipientId: booking.careRecipientId,
    planType: booking.planType,
    status: booking.status,
    hours: booking.hours,
    serviceDate: booking.serviceDate.toISOString().slice(0, 10),
    startTime: booking.startTime.toString(),
    endTime: TimeOfDay.fromMinutes(endMinute % MINUTES_IN_DAY).toString(),
    endsNextDay: endMinute >= MINUTES_IN_DAY,
    price: {
      currency: price.currency,
      hourlyRateMinor: price.hourlyRate.amountMinor,
      subtotalMinor: price.subtotal.amountMinor,
      serviceFeeMinor: price.serviceFee.amountMinor,
      totalMinor: price.total.amountMinor,
    },
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
