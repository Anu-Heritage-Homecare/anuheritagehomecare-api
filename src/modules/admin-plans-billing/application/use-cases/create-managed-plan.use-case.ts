import { Inject, Injectable } from '@nestjs/common';
import {
  ManagedCarePlan,
  PlanLifecycle,
  PlanOverview,
} from '@modules/admin-care-plans/domain/managed-care-plan.entity';
import {
  MANAGED_CARE_PLAN_REPOSITORY,
  ManagedCarePlanRepository,
} from '@modules/admin-care-plans/domain/managed-care-plan.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';

interface CreateManagedPlanCommand {
  adminId: string;
  overview: PlanOverview;
  lifecycle: PlanLifecycle;
}

/**
 * Create a new custom care plan. Custom plans carry full configuration but are not
 * wired into booking or checkout yet; only the four core plans drive checkout.
 */
@Injectable()
export class CreateManagedPlanUseCase {
  constructor(
    @Inject(MANAGED_CARE_PLAN_REPOSITORY) private readonly plans: ManagedCarePlanRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: CreateManagedPlanCommand): Promise<{ id: string }> {
    const id = this.ids.generate();
    const plan = ManagedCarePlan.create({
      id,
      overview: command.overview,
      lifecycle: command.lifecycle,
      createdByAdminId: command.adminId,
      now: this.clock.now(),
    });
    await this.plans.save(plan);
    return { id };
  }
}
