import { Inject, Injectable } from '@nestjs/common';
import { ManagedCarePlan } from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import {
  MANAGED_CARE_PLAN_REPOSITORY,
  ManagedCarePlanRepository,
} from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { GetPlanPerformanceUseCase } from './get-plan-performance.use-case';
import { ManagedPlanDetailResult, PlanAnalyticsResult } from '../dto/managed-plan-detail.result';

interface GetManagedPlanDetailCommand {
  id: string;
  currency: Currency;
}

/**
 * The full detail behind the Care Plans tabs (General, Pricing, Services, Coverage,
 * Eligibility, Billing and Renewal Rules, Version History) plus the Analytics figures
 * from the plan performance read for a core plan. Read only.
 */
@Injectable()
export class GetManagedPlanDetailUseCase {
  constructor(
    @Inject(MANAGED_CARE_PLAN_REPOSITORY) private readonly plans: ManagedCarePlanRepository,
    private readonly performance: GetPlanPerformanceUseCase,
  ) {}

  async execute(command: GetManagedPlanDetailCommand): Promise<ManagedPlanDetailResult> {
    const plan = await this.plans.findById(command.id);
    if (plan === null) {
      throw new NotFoundDomainException('Care plan not found');
    }

    return {
      id: plan.id,
      coreType: plan.coreType === null ? null : String(plan.coreType),
      isCore: plan.isCore,
      wiredToCheckout: plan.isCore,
      name: plan.name,
      description: plan.description,
      targetAudience: plan.targetAudience,
      status: String(plan.status),
      billingModel: String(plan.billingModel),
      countriesEnabled: plan.countriesEnabled,
      supportedCurrencies: plan.supportedCurrencies.map((currency) => String(currency)),
      minimumBillingHours: plan.minimumBillingHours,
      lifecycle: {
        autoRenewal: plan.lifecycle.autoRenewal,
        billingCycle: String(plan.lifecycle.billingCycle),
        gracePeriodDays: plan.lifecycle.gracePeriodDays,
        cancellationNoticeDays: plan.lifecycle.cancellationNoticeDays,
        lastUpdated: plan.updatedAt.toISOString(),
      },
      pricing: plan.pricing.map((price) => ({
        currency: String(price.currency),
        monthlyPriceMinor: price.monthlyPriceMinor,
        baseRateMinor: price.baseRateMinor,
        emergencyDispatchRateMinor: price.emergencyDispatchRateMinor,
        weekendPremiumMinor: price.weekendPremiumMinor,
      })),
      services: plan.includedServices.map((service) => ({ ...service })),
      volumeDiscounts: plan.discounts.map((discount) => ({ ...discount })),
      coverageAreas: plan.coverage,
      eligibilityRules: plan.eligibility,
      analytics: await this.analytics(plan, command.currency),
      currentVersion: plan.currentVersion,
      versionHistory: plan.versionHistory.map((version) => ({
        versionNumber: version.versionNumber,
        summary: version.summary,
        changedByAdminId: version.changedByAdminId,
        createdAt: version.createdAt.toISOString(),
      })),
    };
  }

  private async analytics(
    plan: ManagedCarePlan,
    currency: Currency,
  ): Promise<PlanAnalyticsResult | null> {
    if (plan.coreType === null) {
      return null;
    }
    const performance = await this.performance.execute({ currency });
    const card = performance.cards.find((entry) => entry.planType === String(plan.coreType));
    if (card === undefined) {
      return null;
    }
    return {
      subscribers: card.subscribers,
      retentionPercent: card.retentionPercent,
      renewalPercent: card.renewalPercent,
      monthlyRevenueMinor: card.monthlyRevenueMinor,
    };
  }
}
