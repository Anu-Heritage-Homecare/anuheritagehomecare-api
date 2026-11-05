import { Currency } from '@shared/domain/currency.enum';
import { BookingPrice } from '../../domain/value-objects/booking-price.vo';

/** The server computed price breakdown shown on the booking summary screen. */
export interface BookingQuoteResult {
  hours: number;
  currency: Currency;
  hourlyRateMinor: number;
  subtotalMinor: number;
  serviceFeeMinor: number;
  totalMinor: number;
}

export function toBookingQuoteResult(price: BookingPrice): BookingQuoteResult {
  return {
    hours: price.hours,
    currency: price.currency,
    hourlyRateMinor: price.hourlyRate.amountMinor,
    subtotalMinor: price.subtotal.amountMinor,
    serviceFeeMinor: price.serviceFee.amountMinor,
    totalMinor: price.total.amountMinor,
  };
}
