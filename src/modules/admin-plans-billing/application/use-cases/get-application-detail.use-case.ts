import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { ONBOARDING_READ_MODEL, OnboardingReadModel } from '../ports/onboarding-read.port';
import { ApplicationDetailResult } from '../dto/application-detail.result';

/**
 * The Care Request detail panel for one onboarding application: patient information
 * (hybrid, from the linked care recipient or the intake snapshot), the family
 * primary contact, the requested plan and schedule, and the uploaded documents.
 * Read only.
 */
@Injectable()
export class GetApplicationDetailUseCase {
  constructor(
    @Inject(ONBOARDING_READ_MODEL) private readonly reads: OnboardingReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(applicationId: string): Promise<ApplicationDetailResult> {
    const detail = await this.reads.applicationDetail(applicationId);
    if (detail === null) {
      throw new NotFoundDomainException('Onboarding application not found');
    }

    const planType = detail.selectedPlanType === null ? null : String(detail.selectedPlanType);
    let planName: string | null = null;
    if (planType !== null) {
      const catalog = await this.plans.findAllActive();
      planName = catalog.find((plan) => String(plan.type) === planType)?.name ?? planType;
    }

    return {
      id: detail.id,
      reference: detail.reference,
      familyName: detail.familyName,
      patientName: detail.patientName,
      selectedPlanType: planType,
      planName,
      monthlyPriceMinor: detail.monthlyPriceMinor,
      currency: detail.currencyCode,
      priority: String(detail.priority),
      paymentStatus: String(detail.paymentStatus),
      docsStatus: String(detail.docsStatus),
      status: String(detail.status),
      coordinatorName: detail.coordinatorName,
      submittedAt: detail.submittedAt.toISOString(),
      patientAge: ageInYears(detail.patientDateOfBirth, this.clock.now()),
      patientGender: detail.patientGender,
      patientConditions: detail.patientConditions,
      contactName: detail.contactName,
      contactPhone: detail.contactPhone,
      contactEmail: detail.contactEmail,
      contactAddress: detail.contactAddress,
      requestedHoursPerWeek: detail.requestedHoursPerWeek,
      requestedSchedule: detail.requestedSchedule,
      specialNeeds: detail.specialNeeds,
      documents: detail.documents.map((document) => ({ label: document.label, key: document.key })),
    };
  }
}

/** Whole years between a date of birth and now, or null when there is no date. */
function ageInYears(dateOfBirth: Date | null, now: Date): number | null {
  if (dateOfBirth === null) {
    return null;
  }
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}
