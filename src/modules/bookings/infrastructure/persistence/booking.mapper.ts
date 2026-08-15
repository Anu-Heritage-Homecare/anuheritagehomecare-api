import {
  Booking as PrismaBooking,
  BookingStatus as PrismaBookingStatus,
  CarePlanType as PrismaCarePlanType,
  Currency as PrismaCurrency,
} from '@prisma/client';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Booking } from '../../domain/booking.entity';
import { BookingStatus } from '../../domain/booking-status.enum';
import { BookingPrice } from '../../domain/value-objects/booking-price.vo';
import { TimeOfDay } from '../../domain/value-objects/time-of-day.vo';

/** Translates between the Prisma booking row and the Booking aggregate. */
export class BookingMapper {
  static toDomain(row: PrismaBooking): Booking {
    const currency = BookingMapper.TO_DOMAIN_CURRENCY[row.currency];
    const price = BookingPrice.rehydrate({
      currency,
      hourlyRate: Money.fromMinor(row.hourlyRateMinor, currency),
      hours: row.hours,
      subtotal: Money.fromMinor(row.subtotalMinor, currency),
      serviceFee: Money.fromMinor(row.serviceFeeMinor, currency),
      total: Money.fromMinor(row.totalMinor, currency),
    });

    return Booking.rehydrate(row.id, {
      ownerId: row.ownerId,
      careRecipientId: row.careRecipientId,
      planType: BookingMapper.TO_DOMAIN_PLAN[row.planType],
      hours: row.hours,
      serviceDate: row.serviceDate,
      startTime: TimeOfDay.fromMinutes(row.startMinute),
      price,
      status: BookingMapper.TO_DOMAIN_STATUS[row.status],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(booking: Booking): PrismaBooking {
    const price = booking.price;
    return {
      id: booking.id,
      ownerId: booking.ownerId,
      careRecipientId: booking.careRecipientId,
      planType: BookingMapper.TO_PERSISTENCE_PLAN[booking.planType],
      hours: booking.hours,
      serviceDate: booking.serviceDate,
      startMinute: booking.startTime.minutes,
      endMinute: booking.endMinute,
      currency: BookingMapper.TO_PERSISTENCE_CURRENCY[price.currency],
      hourlyRateMinor: price.hourlyRate.amountMinor,
      subtotalMinor: price.subtotal.amountMinor,
      serviceFeeMinor: price.serviceFee.amountMinor,
      totalMinor: price.total.amountMinor,
      status: BookingMapper.TO_PERSISTENCE_STATUS[booking.status],
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  private static readonly TO_DOMAIN_CURRENCY: Record<PrismaCurrency, Currency> = {
    USD: Currency.UnitedStatesDollar,
    NGN: Currency.NigerianNaira,
  };

  private static readonly TO_PERSISTENCE_CURRENCY: Record<Currency, PrismaCurrency> = {
    [Currency.UnitedStatesDollar]: 'USD',
    [Currency.NigerianNaira]: 'NGN',
  };

  private static readonly TO_DOMAIN_PLAN: Record<PrismaCarePlanType, CarePlanType> = {
    FLEXIBLE: CarePlanType.Flexible,
    STANDARD_MONTHLY: CarePlanType.StandardMonthly,
    PREMIUM: CarePlanType.Premium,
    LIVE_IN: CarePlanType.LiveIn,
  };

  private static readonly TO_PERSISTENCE_PLAN: Record<CarePlanType, PrismaCarePlanType> = {
    [CarePlanType.Flexible]: 'FLEXIBLE',
    [CarePlanType.StandardMonthly]: 'STANDARD_MONTHLY',
    [CarePlanType.Premium]: 'PREMIUM',
    [CarePlanType.LiveIn]: 'LIVE_IN',
  };

  private static readonly TO_DOMAIN_STATUS: Record<PrismaBookingStatus, BookingStatus> = {
    PENDING_PAYMENT: BookingStatus.PendingPayment,
    CONFIRMED: BookingStatus.Confirmed,
    CANCELLED: BookingStatus.Cancelled,
  };

  private static readonly TO_PERSISTENCE_STATUS: Record<BookingStatus, PrismaBookingStatus> = {
    [BookingStatus.PendingPayment]: 'PENDING_PAYMENT',
    [BookingStatus.Confirmed]: 'CONFIRMED',
    [BookingStatus.Cancelled]: 'CANCELLED',
  };
}
