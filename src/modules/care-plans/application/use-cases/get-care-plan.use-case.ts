import { Inject, Injectable } from '@nestjs/common';
import { Currency } from '@shared/domain/currency.enum';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { CARE_PLAN_REPOSITORY, CarePlanRepository } from '../../domain/care-plan.repository';
import { CarePlanType } from '../../domain/care-plan-type.enum';
import { CarePlanResult, toCarePlanResult } from '../dto/care-plan.result';

/** Use case: fetch a single active care plan by type, priced in the owner's currency. */
@Injectable()
export class GetCarePlanUseCase {
  constructor(@Inject(CARE_PLAN_REPOSITORY) private readonly plans: CarePlanRepository) {}

  async execute(params: { type: CarePlanType; currency: Currency }): Promise<CarePlanResult> {
    const plan = await this.plans.findByType(params.type);
    if (plan === null || !plan.active) {
      throw new NotFoundDomainException('Care plan not found');
    }
    return toCarePlanResult(plan, params.currency);
  }
}
