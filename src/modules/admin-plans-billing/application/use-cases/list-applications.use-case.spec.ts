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
        familyName: 'Adeyemi Family',
        patientName: 'Folake Adeyemi',
        selectedPlanType: 'STANDARD_MONTHLY',
        monthlyPriceMinor: 124_500,
        paymentStatus: 'PAID',
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

function useCase(): ListApplicationsUseCase {
  const reads: OnboardingReadModel = {
    pipeline: () => Promise.reject(new Error('unused')),
    activation: () => Promise.reject(new Error('unused')),
    verificationQueue: () => Promise.resolve(page()),
  };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () => Promise.resolve(catalog()),
  };
  return new ListApplicationsUseCase(reads, plans);
}

describe('ListApplicationsUseCase', () => {
  it('maps applications with the selected plan name and coordinator', async () => {
    const result = await useCase().execute({
      currency: Currency.UnitedStatesDollar,
      status: null,
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    const row = result.rows[0];
    expect(row.familyName).toBe('Adeyemi Family');
    expect(row.selectedPlanType).toBe('STANDARD_MONTHLY');
    expect(row.planName).toBe('Standard Care');
    expect(row.paymentStatus).toBe('PAID');
    expect(row.coordinatorName).toBe('Dr Jane Foster');
    expect(row.status).toBe('APPROVED');
    expect(row.currency).toBe('USD');
  });
});
