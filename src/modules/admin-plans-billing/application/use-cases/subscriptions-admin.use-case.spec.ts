import { SubscriptionStatus } from '@prisma/client';
import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { Currency } from '@shared/domain/currency.enum';
import {
  EnrichedSubscriptionPageView,
  SubscriptionKpisView,
  SubscriptionsAdminReadModel,
} from '../ports/subscriptions-admin-read.port';
import { GetSubscriptionKpisUseCase } from './get-subscription-kpis.use-case';
import { ListEnrichedSubscriptionsUseCase } from './list-enriched-subscriptions.use-case';

const NOW = new Date('2026-09-20T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function page(): EnrichedSubscriptionPageView {
  return {
    total: 1,
    rows: [
      {
        id: 's1',
        recipientName: 'Emma Wilson',
        recipientDateOfBirth: new Date('1944-05-10T00:00:00.000Z'),
        accountHolderName: 'Arthur Wilson',
        planType: 'FLEXIBLE',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        startDate: new Date('2026-03-15T00:00:00.000Z'),
        monthlyPriceMinor: 120_000,
        coordinatorName: 'Dr Jane Foster',
        caregiverName: 'Maria Garcia',
        flexAllocatedTenths: 400,
        flexConsumedTenths: 285,
      },
    ],
  };
}

function kpis(): SubscriptionKpisView {
  return {
    totalActive: 1_128,
    paused: 47,
    pendingActivation: 31,
    cancelled: 23,
    renewingSoon: 89,
    expiring: 14,
    activeScanned: 1_128,
    activeTotal: 1_128,
  };
}

function reads(): SubscriptionsAdminReadModel {
  return {
    listEnriched: () => Promise.resolve(page()),
    subscriptionKpis: () => Promise.resolve(kpis()),
    subscriptionDetail: () => Promise.resolve(null),
  };
}

function catalog(): CarePlanRepository {
  return {
    findByType: () => Promise.resolve(null),
    findAllActive: () =>
      Promise.resolve([
        { type: CarePlanType.Flexible, name: 'Flexible Care' } as unknown as CarePlan,
      ]),
  };
}

describe('ListEnrichedSubscriptionsUseCase', () => {
  it('enriches a Flexible row with age, coordinator, caregiver and hours usage', async () => {
    const result = await new ListEnrichedSubscriptionsUseCase(reads(), catalog(), clock).execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    const row = result.rows[0];
    expect(row.patientAge).toBe(82);
    expect(row.planName).toBe('Flexible Care');
    expect(row.coordinatorName).toBe('Dr Jane Foster');
    expect(row.caregiverName).toBe('Maria Garcia');
    expect(row.autoRenew).toBe(true);
    expect(row.flexibleHours).toEqual({
      allocatedHours: 40,
      usedHours: 28.5,
      remainingHours: 11.5,
      percentUsed: 71.3,
    });
  });
});

describe('GetSubscriptionKpisUseCase', () => {
  it('returns the six KPI figures', async () => {
    const result = await new GetSubscriptionKpisUseCase(reads(), clock).execute({
      currency: Currency.UnitedStatesDollar,
    });
    expect(result.totalActive).toBe(1_128);
    expect(result.paused).toBe(47);
    expect(result.renewingSoon).toBe(89);
    expect(result.expiring).toBe(14);
    expect(result.capped).toBe(false);
  });
});
