import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  SERVICE_OFFERING_REPOSITORY,
  ServiceOfferingRepository,
} from '../../domain/service-offering.repository';
import {
  VISIT_FORMAT_REPOSITORY,
  VisitFormatRepository,
} from '../../domain/visit-format.repository';
import {
  SCHEDULING_GUARDRAILS_REPOSITORY,
  SchedulingGuardrailsRepository,
} from '../../domain/scheduling-guardrails.repository';
import { TASK_CHECKLIST_READ_PORT, TaskChecklistReadPort } from '../ports/task-checklist-read.port';
import { CareOperationsResult, loadCareOperationsResult } from '../dto/care-operations.result';

/** Use case: read the whole Care Operations settings screen. Also the reload for mutations. */
@Injectable()
export class GetCareOperationsUseCase {
  constructor(
    @Inject(SERVICE_OFFERING_REPOSITORY) private readonly services: ServiceOfferingRepository,
    @Inject(VISIT_FORMAT_REPOSITORY) private readonly formats: VisitFormatRepository,
    @Inject(SCHEDULING_GUARDRAILS_REPOSITORY)
    private readonly guardrails: SchedulingGuardrailsRepository,
    @Inject(TASK_CHECKLIST_READ_PORT) private readonly checklists: TaskChecklistReadPort,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute(): Promise<CareOperationsResult> {
    return loadCareOperationsResult(
      this.services,
      this.formats,
      this.guardrails,
      this.checklists,
      this.clock.now(),
    );
  }
}
