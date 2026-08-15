import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { SubscriptionStatus } from '../../domain/subscription-status.enum';
import {
  FakeCarePlanRepository,
  FakeCareRecipientAccess,
  InMemorySubscriptionRepository,
  fixedClock,
  sequentialIds,
} from '../../test-support/doubles';
import { CreateSubscriptionUseCase } from './create-subscription.use-case';

describe('CreateSubscriptionUseCase', () => {
  let subscriptions: InMemorySubscriptionRepository;
  let useCase: CreateSubscriptionUseCase;

  beforeEach(() => {
    subscriptions = new InMemorySubscriptionRepository();
    useCase = new CreateSubscriptionUseCase(
      subscriptions,
      new FakeCarePlanRepository(),
      new FakeCareRecipientAccess(),
      fixedClock,
      sequentialIds('sub'),
    );
  });

  it('creates a monthly subscription awaiting payment with the snapshotted price', async () => {
    const result = await useCase.execute({
      ownerId: 'owner-1',
      currency: Currency.UnitedStatesDollar,
      careRecipientId: 'recipient-1',
      planType: CarePlanType.StandardMonthly,
      startDate: '2026-08-01',
    });

    expect(result.status).toBe(SubscriptionStatus.PendingPayment);
    expect(result.monthlyPriceMinor).toBe(50_000);
    expect(subscriptions.store.size).toBe(1);
  });

  it('refuses to subscribe to the hourly Flexible plan', async () => {
    await expect(
      useCase.execute({
        ownerId: 'owner-1',
        currency: Currency.UnitedStatesDollar,
        careRecipientId: 'recipient-1',
        planType: CarePlanType.Flexible,
        startDate: '2026-08-01',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
