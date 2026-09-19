import { BillingModel } from '@modules/care-plans/domain/billing-model.enum';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import {
  ManagedCarePlan,
  PlanLifecycle,
  PlanOverview,
} from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import { ManagedCarePlanRepository } from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { BillingCycle } from '@modules/admin-care-plans/domain/billing-cycle.enum';
import { ManagedPlanStatus } from '@modules/admin-care-plans/domain/managed-plan-status.enum';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CreateManagedPlanUseCase } from './create-managed-plan.use-case';
import { EditManagedPlanUseCase } from './edit-managed-plan.use-case';

const NOW = new Date('2026-10-18T09:00:00.000Z');
const clock = { now: () => NOW };

function overview(): PlanOverview {
  return {
    name: 'Weekend Respite',
    description: 'Custom weekend cover.',
    targetAudience: null,
    billingModel: BillingModel.Monthly,
    countriesEnabled: ['US'],
    supportedCurrencies: [Currency.UnitedStatesDollar],
    minimumBillingHours: null,
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

function repo(
  plan: ManagedCarePlan | null,
): ManagedCarePlanRepository & { saved: ManagedCarePlan[] } {
  const saved: ManagedCarePlan[] = [];
  return {
    saved,
    save: (p) => {
      saved.push(p);
      return Promise.resolve();
    },
    findById: () => Promise.resolve(plan),
    findByCoreType: () => Promise.resolve(null),
    listAll: () => Promise.resolve([]),
  };
}

describe('CreateManagedPlanUseCase', () => {
  it('creates a custom plan and returns its id', async () => {
    const store = repo(null);
    const ids = { generate: () => 'new-plan' };
    const result = await new CreateManagedPlanUseCase(store, ids, clock).execute({
      adminId: 'admin-1',
      overview: overview(),
      lifecycle: lifecycle(),
    });
    expect(result.id).toBe('new-plan');
    expect(store.saved).toHaveLength(1);
    expect(store.saved[0].isCore).toBe(false);
  });
});

describe('EditManagedPlanUseCase', () => {
  function core(): ManagedCarePlan {
    return ManagedCarePlan.create({
      id: 'plan-1',
      coreType: CarePlanType.Flexible,
      overview: overview(),
      lifecycle: lifecycle(),
      now: NOW,
    });
  }

  it('edits the coverage section and records a version', async () => {
    const plan = core();
    const store = repo(plan);
    await new EditManagedPlanUseCase(store, clock).execute({
      planId: 'plan-1',
      adminId: 'admin-2',
      section: 'COVERAGE',
      coverageAreas: ['Springfield', 'Shelbyville'],
    });
    expect(plan.coverage).toEqual(['Springfield', 'Shelbyville']);
    expect(plan.currentVersion).toBe(2);
    expect(store.saved).toHaveLength(1);
  });

  it('archives via the status section', async () => {
    const plan = core();
    await new EditManagedPlanUseCase(repo(plan), clock).execute({
      planId: 'plan-1',
      adminId: 'admin-2',
      section: 'STATUS',
      status: ManagedPlanStatus.Archived,
    });
    expect(plan.status).toBe(ManagedPlanStatus.Archived);
  });

  it('rejects editing an unknown plan', async () => {
    await expect(
      new EditManagedPlanUseCase(repo(null), clock).execute({
        planId: 'nope',
        adminId: 'admin-2',
        section: 'COVERAGE',
        coverageAreas: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
