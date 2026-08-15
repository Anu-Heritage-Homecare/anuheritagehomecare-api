import { Currency } from './currency.enum';
import { ValidationException } from './domain-exception';
import { ValueObject } from './value-object.base';

interface MoneyProps {
  amountMinor: number;
  currency: Currency;
}

/**
 * A monetary amount stored as an integer number of minor units (cents, kobo) in
 * a specific currency. Storing minor units as integers avoids floating point
 * rounding errors in money maths. Amounts are non negative (the platform charges,
 * it does not model debts), and operations across currencies are rejected.
 *
 * This lives in the shared kernel deliberately: bookings, subscriptions and
 * payments must share one money implementation so their totals always agree.
 */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  public static fromMinor(amountMinor: number, currency: Currency): Money {
    if (!Number.isInteger(amountMinor)) {
      throw new ValidationException('Money amount must be an integer number of minor units');
    }
    if (amountMinor < 0) {
      throw new ValidationException('Money amount cannot be negative');
    }
    return new Money({ amountMinor, currency });
  }

  public static zero(currency: Currency): Money {
    return new Money({ amountMinor: 0, currency });
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({
      amountMinor: this.props.amountMinor + other.props.amountMinor,
      currency: this.props.currency,
    });
  }

  public multiply(factor: number): Money {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new ValidationException('Money can only be multiplied by a non negative integer');
    }
    return new Money({
      amountMinor: this.props.amountMinor * factor,
      currency: this.props.currency,
    });
  }

  private assertSameCurrency(other: Money): void {
    if (other.props.currency !== this.props.currency) {
      throw new ValidationException('Cannot combine amounts in different currencies');
    }
  }

  public get amountMinor(): number {
    return this.props.amountMinor;
  }

  public get currency(): Currency {
    return this.props.currency;
  }
}
