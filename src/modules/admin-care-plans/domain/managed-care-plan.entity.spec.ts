import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { ValidationException } from '@shared/domain/domain-exception';
import { BillingCycle } from './billing-cycle.enum';
import { ManagedCarePlan, PlanLifecycle, PlanOverview } from './managed-care-plan.entity';
import { ManagedPlanStatus } from './managed-plan-status.enum';

const T0 = new Date('2026-10-18T09:00:00.000Z');
const T1 = new Date('2026-10-19T09:00:00.000Z');

function overview(over: Partial<PlanOverview> = {}): PlanOverview {
  return {
    name: '  Flexible Care  ',
    description: 'Pay per hour care plan for families who need occasional support.',
    targetAudience: 'Families with intermittent care needs',
    billingModel: BillingModel.Hourly,
    countriesEnabled: ['us', 'ng'],
    supportedCurrencies: [Currency.UnitedStatesDollar, Currency.NigerianNaira],
    minimumBillingHours: 10,
    ...over,
  };
}

function lifecycle(): PlanLifecycle {
  return {
    autoRenewal: true,
    billingCycle: BillingCycle.Monthly,
    gracePeriodDays: 7,
    cancellationNoticeDays: 30,
  };
}

function core(): ManagedCarePlan {
  return ManagedCarePlan.create({
    id: 'plan-1',
    coreType: CarePlanType.Flexible,
    overview: overview(),
    lifecycle: lifecycle(),
    createdByAdminId: 'admin-1',
    now: T0,
  });
}

describe('ManagedCarePlan', () => {
  it('creates a core plan, normalising names and countries, and records version 1', () => {
    const plan = core();
    expect(plan.isCore).toBe(true);
    expect(plan.coreType).toBe(CarePlanType.Flexible);
    expect(plan.name).toBe('Flexible Care');
    expect(plan.countriesEnabled).toEqual(['US', 'NG']);
    expect(plan.status).toBe(ManagedPlanStatus.Active);
    expect(plan.currentVersion).toBe(1);
    expect(plan.versionHistory[0].summary).toBe('Plan created');
  });

  it('creates a custom plan with no core link', () => {
    const plan = ManagedCarePlan.create({
      id: 'custom-1',
      overview: overview({ name: 'Weekend Respite' }),
      lifecycle: lifecycle(),
      now: T0,
    });
    expect(plan.isCore).toBe(false);
    expect(plan.coreType).toBeNull();
  });

  it('records a version on each revision and bumps the counter', () => {
    const plan = core();
    plan.reviseLifecycle({ ...lifecycle(), gracePeriodDays: 14 }, 'admin-2', T1);
    expect(plan.lifecycle.gracePeriodDays).toBe(14);
    expect(plan.currentVersion).toBe(2);
    expect(plan.versionHistory[1].summary).toBe('Renewal and billing rules updated');
    expect(plan.pullPendingVersions()).toHaveLength(2);
    expect(plan.pullPendingVersions()).toHaveLength(0);
  });

  it('sets services and coverage, deduplicating trimmed coverage areas', () => {
    const plan = core();
    plan.setServices(
      [{ key: 'MEDICATION_SUPPORT', name: 'Medication Support', description: 'x', enabled: true }],
      'admin-1',
      T1,
    );
    plan.setCoverageAreas([' Springfield ', 'Springfield', 'Shelbyville'], 'admin-1', T1);
    expect(plan.includedServices).toHaveLength(1);
    expect(plan.coverage).toEqual(['Springfield', 'Shelbyville']);
  });

  it('rejects an unsupported country and archives idempotently', () => {
    expect(() =>
      ManagedCarePlan.create({
        id: 'p',
        overview: overview({ countriesEnabled: ['FR'] }),
        lifecycle: lifecycle(),
        now: T0,
      }),
    ).toThrow(ValidationException);

    const plan = core();
    plan.archive('admin-1', T1);
    expect(plan.status).toBe(ManagedPlanStatus.Archived);
    expect(() => plan.archive('admin-1', T1)).toThrow(ValidationException);
  });
});
