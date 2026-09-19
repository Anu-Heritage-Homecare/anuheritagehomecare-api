import { Inject, Injectable } from '@nestjs/common';
import { ManagedCarePlan } from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import {
  MANAGED_CARE_PLAN_REPOSITORY,
  ManagedCarePlanRepository,
} from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { Currency } from '@shared/domain/currency.enum';
import { GetPlanPerformanceUseCase } from './get-plan-performance.use-case';
import { PlanCardResult } from '../dto/plan-performance-cards.result';
import {
  ManagedPlanCardResult,
  ManagedPlanCatalogueResult,
} from '../dto/managed-plan-catalogue.result';

interface ListManagedPlansCommand {
  currency: Currency;
  includeArchived: boolean;
}

/**
 * The Active Care Plan Catalogue cards: each managed plan with its configured monthly
 * price, and the live subscriber, retention and revenue figures for the core plans
 * (from the plan performance read). Custom plans are not wired into checkout, so they
 * carry no subscriber metrics yet. Read only.
 */
@Injectable()
export class ListManagedPlansUseCase {
  constructor(
    @Inject(MANAGED_CARE_PLAN_REPOSITORY) private readonly plans: ManagedCarePlanRepository,
    private readonly performance: GetPlanPerformanceUseCase,
  ) {}

  async execute(command: ListManagedPlansCommand): Promise<ManagedPlanCatalogueResult> {
    const [managed, performance] = await Promise.all([
      this.plans.listAll(command.includeArchived),
      this.performance.execute({ currency: command.currency }),
    ]);
    const byPlanType = new Map(performance.cards.map((card) => [card.planType, card]));

    return {
      currency: String(command.currency),
      plans: managed.map((plan) => this.toCard(plan, command.currency, byPlanType)),
    };
  }

  private toCard(
    plan: ManagedCarePlan,
    currency: Currency,
    performance: Map<string, PlanCardResult>,
  ): ManagedPlanCardResult {
    const price = plan.pricing.find((entry) => entry.currency === currency) ?? null;
    const perf = plan.coreType === null ? undefined : performance.get(String(plan.coreType));
    return {
      id: plan.id,
      coreType: plan.coreType === null ? null : String(plan.coreType),
      isCore: plan.isCore,
      wiredToCheckout: plan.isCore,
      name: plan.name,
      description: plan.description,
      status: String(plan.status),
      billingModel: String(plan.billingModel),
      monthlyPriceMinor: price?.monthlyPriceMinor ?? null,
      currency: String(currency),
      subscribers: perf?.subscribers ?? 0,
      retentionPercent: perf?.retentionPercent ?? null,
      estRevenueMinor: perf?.monthlyRevenueMinor ?? 0,
    };
  }
}
