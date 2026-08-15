import { ConfigService } from '@nestjs/config';
import { Clock } from '@shared/application/ports/clock.port';
import { IdGenerator } from '@shared/application/ports/id-generator.port';
import { Currency } from '@shared/domain/currency.enum';
import { Money } from '@shared/domain/money.vo';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanPrice } from '@modules/care-plans/domain/value-objects/care-plan-price.vo';
import { CareRecipientAccess } from '../application/ports/care-recipient-access.port';
import { Booking } from '../domain/booking.entity';
import { BookingRepository } from '../domain/booking.repository';
import { Subscription } from '../domain/subscription.entity';
import { SubscriptionRepository } from '../domain/subscription.repository';

export const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z');

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function sequentialIds(prefix = 'id'): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return `${prefix}-${counter}`;
    },
  };
}

export function fakeBookingConfig(dayStartHour = 8, dayEndHour = 21): ConfigService {
  return { getOrThrow: () => ({ dayStartHour, dayEndHour }) } as unknown as ConfigService;
}

function usd(amount: number): Money {
  return Money.fromMinor(amount, Currency.UnitedStatesDollar);
}

function ngn(amount: number): Money {
  return Money.fromMinor(amount, Currency.NigerianNaira);
}

/** A catalog stub with the Flexible and monthly plans used by the specs. */
export class FakeCarePlanRepository implements CarePlanRepository {
  private readonly plans = new Map<CarePlanType, CarePlan>([
    [
      CarePlanType.Flexible,
      CarePlan.rehydrate('plan-flexible', {
        type: CarePlanType.Flexible,
        name: 'Flexible Plan',
        description: 'Pay only for the hours you need.',
        billingModel: BillingModel.Hourly,
        allowedHours: [3, 4, 6, 8, 10, 12, 14, 16, 24],
        active: true,
        prices: [
          CarePlanPrice.create(Currency.UnitedStatesDollar, usd(3000), usd(1000)),
          CarePlanPrice.create(Currency.NigerianNaira, ngn(1_500_000), ngn(500_000)),
        ],
      }),
    ],
    [
      CarePlanType.StandardMonthly,
      CarePlan.rehydrate('plan-standard', {
        type: CarePlanType.StandardMonthly,
        name: 'Standard Monthly Plan',
        description: 'Fixed daily schedule with consistent care.',
        billingModel: BillingModel.Monthly,
        allowedHours: [],
        active: true,
        prices: [CarePlanPrice.create(Currency.UnitedStatesDollar, usd(50_000), usd(0))],
      }),
    ],
  ]);

  findByType(type: CarePlanType): Promise<CarePlan | null> {
    return Promise.resolve(this.plans.get(type) ?? null);
  }

  findAllActive(): Promise<CarePlan[]> {
    return Promise.resolve([...this.plans.values()]);
  }
}

/** Accepts only owner-1 / recipient-1 as a bookable, onboarded care recipient. */
export class FakeCareRecipientAccess implements CareRecipientAccess {
  assertBookable(ownerId: string, careRecipientId: string): Promise<void> {
    if (ownerId === 'owner-1' && careRecipientId === 'recipient-1') {
      return Promise.resolve();
    }
    return Promise.reject(new NotFoundDomainException('Care recipient not found'));
  }
}

export class InMemoryBookingRepository implements BookingRepository {
  public readonly store = new Map<string, Booking>();

  save(booking: Booking): Promise<void> {
    this.store.set(booking.id, booking);
    return Promise.resolve();
  }

  findById(id: string): Promise<Booking | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  listByOwner(ownerId: string): Promise<Booking[]> {
    return Promise.resolve([...this.store.values()].filter((b) => b.ownerId === ownerId));
  }
}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
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
