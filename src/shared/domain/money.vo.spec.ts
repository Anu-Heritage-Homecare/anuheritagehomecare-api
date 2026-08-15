import { Currency } from './currency.enum';
import { ValidationException } from './domain-exception';
import { Money } from './money.vo';

describe('Money', () => {
  it('adds and multiplies within a currency', () => {
    const rate = Money.fromMinor(3000, Currency.UnitedStatesDollar);
    const fee = Money.fromMinor(1000, Currency.UnitedStatesDollar);

    expect(rate.multiply(6).amountMinor).toBe(18000);
    expect(rate.multiply(6).add(fee).amountMinor).toBe(19000);
  });

  it('rejects mixing currencies', () => {
    const usd = Money.fromMinor(1000, Currency.UnitedStatesDollar);
    const ngn = Money.fromMinor(1000, Currency.NigerianNaira);

    expect(() => usd.add(ngn)).toThrow(ValidationException);
  });

  it('rejects negative and non integer amounts', () => {
    expect(() => Money.fromMinor(-1, Currency.UnitedStatesDollar)).toThrow(ValidationException);
    expect(() => Money.fromMinor(10.5, Currency.UnitedStatesDollar)).toThrow(ValidationException);
  });

  it('rejects multiplying by a non integer or negative factor', () => {
    const money = Money.fromMinor(1000, Currency.NigerianNaira);
    expect(() => money.multiply(1.5)).toThrow(ValidationException);
    expect(() => money.multiply(-2)).toThrow(ValidationException);
  });
});
