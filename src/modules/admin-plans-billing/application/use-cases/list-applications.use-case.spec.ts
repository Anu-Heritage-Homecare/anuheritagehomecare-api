import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Currency } from '@shared/domain/currency.enum';
import { ApplicationPageView, OnboardingReadModel } from '../ports/onboarding-read.port';
import { ListApplicationsUseCase } from './list-applications.use-case';

function page(): ApplicationPageView {
  return {
    total: 1,
    rows: [
      {
        id: 'app-1',
        reference: 'CR-2026-104',
        familyName: 'Adeyemi Family',
        patientName: 'Folake Adeyemi',
        selectedPlanType: 'STANDARD_MONTHLY',
        monthlyPriceMinor: 124_500,
        priority: 'HIGH',
        paymentStatus: 'PAID',
        docsStatus: 'COMPLETE',
        coordinatorName: 'Dr Jane Foster',
        status: 'APPROVED',
        submittedAt: new Date('2026-10-24T00:00:00.000Z'),
      },
    ],
  };
}

function catalog(): CarePlan[] {
  return [{ type: CarePlanType.StandardMonthly, name: 'Standard Care' } as unknown as CarePlan];
}

function useCase(captured?: { filters?: unknown }): ListApplicationsUseCase {
  const reads: OnboardingReadModel = {
    pipeline: () => Promise.reject(new Error('unused')),
    activation: () => Promise.reject(new Error('unused')),
    verificationQueue: (_currency, filters) => {
      if (captured) {
        captured.filters = filters;
      }
      return Promise.resolve(page());
    },
  };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new ListApplicationsUseCase(reads, plans);
}

describe('ListApplicationsUseCase', () => {
  it('maps applications with reference, priority, docs and coordinator', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      priority: null,
      planType: null,
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    const row = result.rows[0];
    expect(row.reference).toBe('CR-2026-104');
    expect(row.priority).toBe('HIGH');
    expect(row.docsStatus).toBe('COMPLETE');
    expect(row.planName).toBe('Standard Care');
    expect(row.coordinatorName).toBe('Dr Jane Foster');
    expect(row.currency).toBe('USD');
  });

  it('passes the status, priority and plan filters through to the read model', async () => {
    const captured: { filters?: unknown } = {};
    await useCase(captured).execute({
      currency: Currency.UnitedStatesDollar,
      status: 'PENDING',
      priority: 'HIGH',
      planType: 'PREMIUM',
      page: 1,
      pageSize: 20,
    });
    expect(captured.filters).toEqual({
      status: 'PENDING',
      priority: 'HIGH',
      planType: 'PREMIUM',
    });
  });
});
