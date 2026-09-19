import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '@modules/bookings/domain/subscription.entity';
import { SubscriptionRepository } from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { ChangeSubscriptionPlanUseCase } from './change-subscription-plan.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function subscription(): Subscription {
  return Subscription.rehydrate('s1', {
    ownerId: 'o1',
    careRecipientId: 'r1',
    planType: CarePlanType.StandardMonthly,
    startDate: new Date('2026-01-10T00:00:00.000Z'),
    monthlyPrice: Money.fromMinor(100_000, Currency.UnitedStatesDollar),
    status: SubscriptionStatus.Active,
    autoRenew: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function repo(sub: Subscription | null): SubscriptionRepository & { saved: Subscription[] } {
  const saved: Subscription[] = [];
  return {
    saved,
    findById: () => Promise.resolve(sub),
    save: (s) => {
      saved.push(s);
      return Promise.resolve();
    },
    listByOwner: () => Promise.resolve([]),
  };
}

function plans(price: Money | null): CarePlanRepository {
  return {
    findAllActive: () => Promise.resolve([]),
    findByType: () =>
      Promise.resolve(
        price === null
          ? ({ priceFor: () => null } as unknown as CarePlan)
          : ({ priceFor: () => ({ unitAmount: price }) } as unknown as CarePlan),
      ),
  };
}

describe('ChangeSubscriptionPlanUseCase', () => {
  it('changes the plan tier and snapshots the catalog price', async () => {
    const sub = subscription();
    const store = repo(sub);
    const useCase = new ChangeSubscriptionPlanUseCase(
      store,
      plans(Money.fromMinor(150_000, Currency.UnitedStatesDollar)),
      clock,
    );
    await useCase.execute({ subscriptionId: 's1', planType: CarePlanType.Premium });
    expect(sub.planType).toBe(CarePlanType.Premium);
    expect(sub.monthlyPrice.amountMinor).toBe(150_000);
    expect(store.saved).toHaveLength(1);
  });

  it('rejects an unknown subscription', async () => {
    const useCase = new ChangeSubscriptionPlanUseCase(
      repo(null),
      plans(Money.fromMinor(150_000, Currency.UnitedStatesDollar)),
      clock,
    );
    await expect(
      useCase.execute({ subscriptionId: 'nope', planType: CarePlanType.Premium }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects the Flexible plan as a subscription tier', async () => {
    const useCase = new ChangeSubscriptionPlanUseCase(
      repo(subscription()),
      plans(Money.fromMinor(150_000, Currency.UnitedStatesDollar)),
      clock,
    );
    await expect(
      useCase.execute({ subscriptionId: 's1', planType: CarePlanType.Flexible }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('rejects a plan with no price in the subscription currency', async () => {
    const useCase = new ChangeSubscriptionPlanUseCase(repo(subscription()), plans(null), clock);
    await expect(
      useCase.execute({ subscriptionId: 's1', planType: CarePlanType.Premium }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
