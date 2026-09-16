import { CarePlan } from '@modules/care-plans/domain/care-plan.entity';
import { CarePlanRepository } from '@modules/care-plans/domain/care-plan.repository';
import { CarePlanType } from '@modules/care-plans/domain/care-plan-type.enum';
import { Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ApplicationDetailView, OnboardingReadModel } from '../ports/onboarding-read.port';
import { GetApplicationDetailUseCase } from './get-application-detail.use-case';

const NOW = new Date('2026-09-16T10:00:00.000Z');
const clock: Clock = { now: () => NOW };

function detail(): ApplicationDetailView {
  return {
    id: 'app-1',
    reference: 'CR-2026-103',
    familyName: 'Wilson Family',
    patientName: 'Emma Wilson',
    selectedPlanType: 'FLEXIBLE',
    monthlyPriceMinor: null,
    currencyCode: 'USD',
    priority: 'MEDIUM',
    paymentStatus: 'PENDING',
    docsStatus: 'INCOMPLETE',
    status: 'PENDING',
    coordinatorName: null,
    submittedAt: new Date('2026-10-23T00:00:00.000Z'),
    patientDateOfBirth: new Date('1944-05-10T00:00:00.000Z'),
    patientGender: 'Female',
    patientConditions: ['Mild Dementia', 'Hypertension'],
    contactName: 'Arthur Wilson',
    contactPhone: '+1 (555) 019-2834',
    contactEmail: 'arthur.wilson@example.com',
    contactAddress: '742 Evergreen Terrace, Springfield',
    requestedHoursPerWeek: 30,
    requestedSchedule: 'Mon, Wed, Fri 9:00 AM - 7:00 PM',
    specialNeeds: 'Medication administration during lunch, assistance walking.',
    documents: [{ label: 'Identity_Verification_Emma.pdf', key: 'k1' }],
  };
}

function useCase(view: ApplicationDetailView | null): GetApplicationDetailUseCase {
  const reads: OnboardingReadModel = {
    pipeline: () => Promise.reject(new Error('unused')),
    activation: () => Promise.reject(new Error('unused')),
    verificationQueue: () => Promise.reject(new Error('unused')),
    applicationDetail: () => Promise.resolve(view),
  };
  const plans: CarePlanRepository = {
    findByType: () => Promise.resolve(null),
    findAllActive: () =>
      Promise.resolve([
        { type: CarePlanType.Flexible, name: 'Flexible Plan' } as unknown as CarePlan,
      ]),
  };
  return new GetApplicationDetailUseCase(reads, plans, clock);
}

describe('GetApplicationDetailUseCase', () => {
  it('composes the detail with plan name, patient age and documents', async () => {
    const result = await useCase(detail()).execute('app-1');
    expect(result.reference).toBe('CR-2026-103');
    expect(result.planName).toBe('Flexible Plan');
    expect(result.patientAge).toBe(82);
    expect(result.patientGender).toBe('Female');
    expect(result.patientConditions).toEqual(['Mild Dementia', 'Hypertension']);
    expect(result.contactName).toBe('Arthur Wilson');
    expect(result.requestedHoursPerWeek).toBe(30);
    expect(result.documents).toHaveLength(1);
  });

  it('rejects an unknown application', async () => {
    await expect(useCase(null).execute('nope')).rejects.toBeInstanceOf(NotFoundDomainException);
  });
});
