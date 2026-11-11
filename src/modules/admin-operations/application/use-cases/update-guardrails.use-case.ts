import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { AutoAssignAlgorithm } from '../../domain/auto-assign-algorithm.enum';
import { SchedulingGuardrails } from '../../domain/scheduling-guardrails.entity';
import {
  SCHEDULING_GUARDRAILS_ID,
  SCHEDULING_GUARDRAILS_REPOSITORY,
  SchedulingGuardrailsRepository,
} from '../../domain/scheduling-guardrails.repository';
import { CareOperationsResult } from '../dto/care-operations.result';
import { GetCareOperationsUseCase } from './get-care-operations.use-case';

export interface UpdateGuardrailsCommand {
  minimumNoticeHours?: number;
  travelBufferMinutes?: number;
  maxVisitsPerCaregiverPerDay?: number;
  autoAssignAlgorithm?: AutoAssignAlgorithm;
}

/** Use case: revise the scheduling guardrails (the per row Edit actions). */
@Injectable()
export class UpdateGuardrailsUseCase {
  constructor(
    @Inject(SCHEDULING_GUARDRAILS_REPOSITORY)
    private readonly guardrails: SchedulingGuardrailsRepository,
    private readonly screen: GetCareOperationsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: UpdateGuardrailsCommand): Promise<CareOperationsResult> {
    const now = this.clock.now();
    const guardrails =
      (await this.guardrails.get()) ?? SchedulingGuardrails.defaults(SCHEDULING_GUARDRAILS_ID, now);
    guardrails.edit(command, now);
    await this.guardrails.save(guardrails);
    return this.screen.execute();
  }
}
