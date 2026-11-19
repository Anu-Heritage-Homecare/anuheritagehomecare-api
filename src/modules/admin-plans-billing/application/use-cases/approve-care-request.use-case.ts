import { Inject, Injectable } from '@nestjs/common';
import {
  ADDITIONAL_CARE_REQUEST_REPOSITORY,
  AdditionalCareRequestRepository,
} from '@modules/care-requests/domain/additional-care-request.repository';
import {
  VISIT_SCHEDULER,
  VisitScheduler,
} from '@modules/visits/application/ports/visit-scheduler.port';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface ApproveCareRequestCommand {
  requestId: string;
  adminId: string;
}

/**
 * Admin action: approve a pending additional care request, recording the acting
 * admin, and schedule the resulting Unassigned visit for the requested day and
 * window so the office only has to assign a caregiver. Approving a request that
 * is not pending throws, so the visit is scheduled at most once per request.
 */
@Injectable()
export class ApproveCareRequestUseCase {
  constructor(
    @Inject(ADDITIONAL_CARE_REQUEST_REPOSITORY)
    private readonly requests: AdditionalCareRequestRepository,
    @Inject(VISIT_SCHEDULER) private readonly visitScheduler: VisitScheduler,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ApproveCareRequestCommand): Promise<void> {
    const request = await this.requests.findById(command.requestId);
    if (request === null) {
      throw new NotFoundDomainException('Care request not found');
    }
    request.approve(command.adminId, this.clock.now());
    await this.requests.save(request);
    await this.visitScheduler.scheduleOneOff({
      careRecipientId: request.careRecipientId,
      date: request.requestedDate,
      startMinute: request.startMinute,
      endMinute: request.startMinute + request.durationMinutes,
    });
  }
}
