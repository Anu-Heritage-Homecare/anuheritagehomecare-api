import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '@modules/bookings/domain/subscription.entity';
import { SubscriptionRepository } from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { CancelSubscriptionUseCase } from './cancel-subscription.use-case';

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

describe('CancelSubscriptionUseCase', () => {
  it('cancels the subscription and saves it', async () => {
    const sub = subscription();
    const store = repo(sub);
    await new CancelSubscriptionUseCase(store, clock).execute({ subscriptionId: 's1' });
    expect(sub.status).toBe(SubscriptionStatus.Cancelled);
    expect(store.saved).toHaveLength(1);
  });

  it('rejects an unknown subscription', async () => {
    await expect(
      new CancelSubscriptionUseCase(repo(null), clock).execute({ subscriptionId: 'nope' }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
