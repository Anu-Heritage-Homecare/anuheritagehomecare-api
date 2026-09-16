import { Inject, Injectable } from '@nestjs/common';
import { Currency as PrismaCurrency, OnboardingStatus as PrismaStatus } from '@prisma/client';
import {
  CARE_PLAN_REPOSITORY,
  CarePlanRepository,
} from '@modules/care-plans/domain/care-plan.repository';
import { Currency } from '@shared/domain/currency.enum';
import { ONBOARDING_READ_MODEL, OnboardingReadModel } from '../ports/onboarding-read.port';
import { ApplicationListResult } from '../dto/application-list.result';

interface ListApplicationsCommand {
  currency: Currency;
  status: PrismaStatus | null;
  page: number;
  pageSize: number;
}

/**
 * List client onboarding applications for the Recent Care Requests verification
 * queue, newest submitted first, with the selected plan name and coordinator
 * resolved. Currency scoped. Read only.
 */
@Injectable()
export class ListApplicationsUseCase {
  constructor(
    @Inject(ONBOARDING_READ_MODEL) private readonly reads: OnboardingReadModel,
    @Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository,
  ) {}

  async execute(command: ListApplicationsCommand): Promise<ApplicationListResult> {
    const prismaCurrency =
      command.currency === Currency.NigerianNaira ? PrismaCurrency.NGN : PrismaCurrency.USD;

    const [page, catalog] = await Promise.all([
      this.reads.verificationQueue(prismaCurrency, command.status, command.page, command.pageSize),
      this.plans.findAllActive(),
    ]);
    const names = new Map(catalog.map((plan) => [String(plan.type), plan.name]));

    return {
      currency: String(command.currency),
      total: page.total,
      page: command.page,
      pageSize: command.pageSize,
      rows: page.rows.map((row) => {
        const planType = row.selectedPlanType === null ? null : String(row.selectedPlanType);
        return {
          id: row.id,
          familyName: row.familyName,
          patientName: row.patientName,
          selectedPlanType: planType,
          planName: planType === null ? null : (names.get(planType) ?? planType),
          monthlyPriceMinor: row.monthlyPriceMinor,
          currency: String(command.currency),
          paymentStatus: String(row.paymentStatus),
          coordinatorName: row.coordinatorName,
          status: String(row.status),
          submittedAt: row.submittedAt.toISOString(),
        };
      }),
    };
  }
}
