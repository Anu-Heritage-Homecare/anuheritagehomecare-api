import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { Money } from '@shared/domain/money.vo';
import { Subscription } from './subscription.entity';
import { SubscriptionStatus } from './subscription-status.enum';

const NOW = new Date('2026-09-20T10:00:00.000Z');

function active(): Subscription {
  const subscription = Subscription.create({
    id: 's1',
    ownerId: 'o1',
    careRecipientId: 'r1',
    planType: CarePlanType.StandardMonthly,
    startDate: new Date('2026-03-15T00:00:00.000Z'),
    monthlyPrice: Money.fromMinor(185_000, Currency.UnitedStatesDollar),
    now: NOW,
  });
  subscription.activate(NOW);
  return subscription;
}

describe('Subscription pause, resume and auto renew', () => {
  it('defaults to auto renew on and toggles it', () => {
    const subscription = active();
    expect(subscription.autoRenew).toBe(true);
    subscription.setAutoRenew(false, NOW);
    expect(subscription.autoRenew).toBe(false);
  });

  it('pauses and resumes an active subscription', () => {
    const subscription = active();
    subscription.pause(NOW);
    expect(subscription.status).toBe(SubscriptionStatus.Paused);
    subscription.resume(NOW);
    expect(subscription.status).toBe(SubscriptionStatus.Active);
  });

  it('rejects pausing a cancelled subscription and resuming a non paused one', () => {
    const cancelled = active();
    cancelled.cancel(NOW);
    expect(() => cancelled.pause(NOW)).toThrow(ValidationException);

    const activeSub = active();
    expect(() => activeSub.resume(NOW)).toThrow(ValidationException);
  });
});
