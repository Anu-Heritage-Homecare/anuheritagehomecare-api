import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Subscription } from '@modules/bookings/domain/subscription.entity';
import { SubscriptionRepository } from '@modules/bookings/domain/subscription.repository';
import { SubscriptionStatus } from '@modules/bookings/domain/subscription-status.enum';
import { SubscriptionOps } from '@modules/subscription-management/domain/subscription-ops.entity';
import { SubscriptionOpsEventType } from '@modules/subscription-management/domain/subscription-ops-event-type.enum';
import { SubscriptionOpsRepository } from '@modules/subscription-management/domain/subscription-ops.repository';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { SubscriptionHoursActionUseCase } from './subscription-hours-action.use-case';
import { SubscriptionLifecycleActionUseCase } from './subscription-lifecycle-action.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock = { now: () => NOW };
const ids = { generate: () => 'ops-new' };

function subscription(): Subscription {
  const sub = Subscription.create({
    id: 'sub-1',
    ownerId: 'o1',
    careRecipientId: 'r1',
    planType: CarePlanType.StandardMonthly,
    startDate: new Date('2026-03-15T00:00:00.000Z'),
    monthlyPrice: Money.fromMinor(185_000, Currency.UnitedStatesDollar),
    now: NOW,
  });
  sub.activate(NOW);
  return sub;
}

function subRepo(sub: Subscription): SubscriptionRepository & { saved: Subscription[] } {
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

function opsRepo(
  existing: SubscriptionOps | null,
): SubscriptionOpsRepository & { saved: SubscriptionOps[] } {
  const saved: SubscriptionOps[] = [];
  return {
    saved,
    findBySubscriptionId: () => Promise.resolve(existing),
    save: (o) => {
      saved.push(o);
      return Promise.resolve();
    },
  };
}

describe('SubscriptionLifecycleActionUseCase', () => {
  it('pauses the subscription and mirrors it onto a freshly created overlay', async () => {
    const sub = subscription();
    const subs = subRepo(sub);
    const overlays = opsRepo(null);
    await new SubscriptionLifecycleActionUseCase(subs, overlays, ids, clock).execute({
      subscriptionId: 'sub-1',
      adminId: 'admin-1',
      action: 'PAUSE',
    });
    expect(sub.status).toBe(SubscriptionStatus.Paused);
    expect(subs.saved).toHaveLength(1);
    const overlay = overlays.saved[0];
    expect(overlay.timeline.some((e) => e.type === SubscriptionOpsEventType.Paused)).toBe(true);
  });

  it('force renews on the overlay only, without touching the subscription', async () => {
    const subs = subRepo(subscription());
    const overlays = opsRepo(null);
    await new SubscriptionLifecycleActionUseCase(subs, overlays, ids, clock).execute({
      subscriptionId: 'sub-1',
      adminId: 'admin-1',
      action: 'FORCE_RENEW',
    });
    expect(subs.saved).toHaveLength(0);
    expect(
      overlays.saved[0].timeline.some((e) => e.type === SubscriptionOpsEventType.RenewalCompleted),
    ).toBe(true);
  });

  it('disables auto renew on the subscription', async () => {
    const sub = subscription();
    await new SubscriptionLifecycleActionUseCase(subRepo(sub), opsRepo(null), ids, clock).execute({
      subscriptionId: 'sub-1',
      adminId: 'admin-1',
      action: 'DISABLE_AUTO_RENEW',
    });
    expect(sub.autoRenew).toBe(false);
  });
});

describe('SubscriptionHoursActionUseCase', () => {
  it('adds hours to the overlay ledger', async () => {
    const existing = SubscriptionOps.create({ id: 'ops-1', subscriptionId: 'sub-1', now: NOW });
    existing.setFlexibleHours(400, 285, new Date('2026-11-15T00:00:00.000Z'), 'admin-1', NOW);
    const overlays = opsRepo(existing);
    await new SubscriptionHoursActionUseCase(overlays, ids, clock).execute({
      subscriptionId: 'sub-1',
      adminId: 'admin-1',
      action: 'ADD_HOURS',
      addHours: 10,
    });
    expect(existing.flexAllocatedTenths).toBe(500);
    expect(overlays.saved).toHaveLength(1);
  });
});
