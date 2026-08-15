import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { ValueObject } from '@shared/domain/value-object.base';

interface BookingPriceProps {
  currency: Currency;
  hourlyRate: Money;
  hours: number;
  subtotal: Money;
  serviceFee: Money;
  total: Money;
}

/**
 * The immutable price breakdown of a Flexible booking, computed server side and
 * snapshotted onto the booking. Subtotal is the hourly rate times the hours, and
 * the total adds the flat service fee. All amounts share one currency.
 */
export class BookingPrice extends ValueObject<BookingPriceProps> {
  private constructor(props: BookingPriceProps) {
    super(props);
  }

  public static compute(hourlyRate: Money, serviceFee: Money, hours: number): BookingPrice {
    if (!Number.isInteger(hours) || hours <= 0) {
      throw new ValidationException('Booking hours must be a positive whole number');
    }
    if (hourlyRate.currency !== serviceFee.currency) {
      throw new ValidationException('Hourly rate and service fee must share a currency');
    }
    const subtotal = hourlyRate.multiply(hours);
    const total = subtotal.add(serviceFee);
    return new BookingPrice({
      currency: hourlyRate.currency,
      hourlyRate,
      hours,
      subtotal,
      serviceFee,
      total,
    });
  }

  public static rehydrate(props: BookingPriceProps): BookingPrice {
    return new BookingPrice(props);
  }

  public get currency(): Currency {
    return this.props.currency;
  }

  public get hourlyRate(): Money {
    return this.props.hourlyRate;
  }

  public get hours(): number {
    return this.props.hours;
  }

  public get subtotal(): Money {
    return this.props.subtotal;
  }

  public get serviceFee(): Money {
    return this.props.serviceFee;
  }

  public get total(): Money {
    return this.props.total;
  }
}
