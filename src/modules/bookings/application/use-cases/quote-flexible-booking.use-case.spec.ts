import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { FakeCarePlanRepository } from '../../test-support/doubles';
import { QuoteFlexibleBookingUseCase } from './quote-flexible-booking.use-case';

describe('QuoteFlexibleBookingUseCase', () => {
  let useCase: QuoteFlexibleBookingUseCase;

  beforeEach(() => {
    useCase = new QuoteFlexibleBookingUseCase(new FakeCarePlanRepository());
  });

  it('prices the breakdown server side without persisting', async () => {
    const result = await useCase.execute({
      currency: Currency.UnitedStatesDollar,
      planType: CarePlanType.Flexible,
      hours: 6,
    });

    expect(result).toEqual({
      hours: 6,
      currency: Currency.UnitedStatesDollar,
      hourlyRateMinor: 3000,
      subtotalMinor: 18000,
      serviceFeeMinor: 1000,
      totalMinor: 19000,
    });
  });

  it('rejects an hours choice the plan does not offer', async () => {
    await expect(
      useCase.execute({
        currency: Currency.UnitedStatesDollar,
        planType: CarePlanType.Flexible,
        hours: 5,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a monthly plan selection (that is the subscription flow)', async () => {
    await expect(
      useCase.execute({
        currency: Currency.UnitedStatesDollar,
        planType: CarePlanType.StandardMonthly,
        hours: 6,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('is not found for a plan the catalog does not carry', async () => {
    await expect(
      useCase.execute({
        currency: Currency.UnitedStatesDollar,
        planType: CarePlanType.LiveIn,
        hours: 6,
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('prices in the owner currency', async () => {
    const result = await useCase.execute({
      currency: Currency.NigerianNaira,
      planType: CarePlanType.Flexible,
      hours: 6,
    });

    expect(result.currency).toBe(Currency.NigerianNaira);
    expect(result.subtotalMinor).toBe(9_000_000);
    expect(result.totalMinor).toBe(9_500_000);
  });
});
