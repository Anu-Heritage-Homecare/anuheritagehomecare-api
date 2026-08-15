import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { BookingPrice } from './booking-price.vo';

describe('BookingPrice', () => {
  const rate = Money.fromMinor(3000, Currency.UnitedStatesDollar);
  const fee = Money.fromMinor(1000, Currency.UnitedStatesDollar);

  it('computes subtotal and total from the hourly rate and fee', () => {
    const price = BookingPrice.compute(rate, fee, 6);

    expect(price.subtotal.amountMinor).toBe(18000);
    expect(price.total.amountMinor).toBe(19000);
    expect(price.currency).toBe(Currency.UnitedStatesDollar);
  });

  it('rejects non positive hours', () => {
    expect(() => BookingPrice.compute(rate, fee, 0)).toThrow(ValidationException);
  });

  it('rejects a rate and fee in different currencies', () => {
    const ngnFee = Money.fromMinor(1000, Currency.NigerianNaira);
    expect(() => BookingPrice.compute(rate, ngnFee, 6)).toThrow(ValidationException);
  });
});
