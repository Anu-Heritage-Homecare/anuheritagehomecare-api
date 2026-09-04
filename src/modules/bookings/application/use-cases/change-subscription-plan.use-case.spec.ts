import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '../../domain/subscription.entity';
import { SubscriptionRepository } from '../../domain/subscription.repository';
import { ChangeSubscriptionPlanUseCase } from './change-subscription-plan.use-case';

const NOW = new Date('2026-09-04T00:00:00.000Z');
const clock: Clock = { now: () => NOW };

class InMemorySubscriptionRepository implements SubscriptionRepository {
  public readonly store = new Map<string, Subscription>();
  save(subscription: Subscription): Promise<void> {
    this.store.set(subscription.id, subscription);
    return Promise.resolve();
  }
  findById(id: string): Promise<Subscription | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }
  listByOwner(ownerId: string): Promise<Subscription[]> {
    return Promise.resolve([...this.store.values()].filter((s) => s.ownerId === ownerId));
  }
}

function standardSubscription(): Subscription {
  const subscription = Subscription.create({
    id: 'sub-1',
    ownerId: 'owner-1',
    careRecipientId: 'r1',
    planType: CarePlanType.StandardMonthly,
    startDate: new Date('2026-07-15T00:00:00.000Z'),
    monthlyPrice: Money.fromMinor(120_000, Currency.UnitedStatesDollar),
    now: NOW,
  });
  subscription.activate(NOW);
  return subscription;
}

describe('ChangeSubscriptionPlanUseCase', () => {
  it('changes the plan type and snapshots the new price', async () => {
    const repo = new InMemorySubscriptionRepository();
    await repo.save(standardSubscription());

    await new ChangeSubscriptionPlanUseCase(repo, clock).execute({
      ownerId: 'owner-1',
      subscriptionId: 'sub-1',
      planType: CarePlanType.Premium,
      monthlyPriceMinor: 189_000,
      currency: 'USD',
    });

    const updated = repo.store.get('sub-1');
    expect(updated?.planType).toBe(CarePlanType.Premium);
    expect(updated?.monthlyPrice.amountMinor).toBe(189_000);
  });

  it('404s a subscription the owner does not own', async () => {
    const repo = new InMemorySubscriptionRepository();
    await repo.save(standardSubscription());

    await expect(
      new ChangeSubscriptionPlanUseCase(repo, clock).execute({
        ownerId: 'someone-else',
        subscriptionId: 'sub-1',
        planType: CarePlanType.Premium,
        monthlyPriceMinor: 189_000,
        currency: 'USD',
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });

  it('rejects changing onto the Flexible plan', async () => {
    const repo = new InMemorySubscriptionRepository();
    await repo.save(standardSubscription());

    await expect(
      new ChangeSubscriptionPlanUseCase(repo, clock).execute({
        ownerId: 'owner-1',
        subscriptionId: 'sub-1',
        planType: CarePlanType.Flexible,
        monthlyPriceMinor: 5000,
        currency: 'USD',
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
