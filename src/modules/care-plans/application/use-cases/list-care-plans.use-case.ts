import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { CARE_PLAN_REPOSITORY, CarePlanRepository } from '../../domain/care-plan.repository';
import { CarePlanResult, toCarePlanResult } from '../dto/care-plan.result';

/** Use case: list the active care plans with prices in the owner's currency. */
@Injectable()
export class ListCarePlansUseCase {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async execute(params: { currency: Currency }): Promise<CarePlanResult[]> {
    const plans = await this.plans.findAllActive();
    return plans.map((plan) => toCarePlanResult(plan, params.currency));
  }
}
