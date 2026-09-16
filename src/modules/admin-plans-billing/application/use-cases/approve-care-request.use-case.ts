import { Inject, Injectable } from '@nestjs/common';
import {
  ADDITIONAL_CARE_REQUEST_REPOSITORY,
  AdditionalCareRequestRepository,
} from '@modules/care-requests/domain/additional-care-request.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface ApproveCareRequestCommand {
  requestId: string;
  adminId: string;
}

/**
 * Admin action: approve a pending additional care request, recording the acting
 * admin. Creating the resulting visit from the approval is a downstream concern
 * handled by scheduling (deferred).
 */
@Injectable()
export class ApproveCareRequestUseCase {
  constructor(
    @Inject(ADDITIONAL_CARE_REQUEST_REPOSITORY)
    private readonly requests: AdditionalCareRequestRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: ApproveCareRequestCommand): Promise<void> {
    const request = await this.requests.findById(command.requestId);
    if (request === null) {
      throw new NotFoundDomainException('Care request not found');
    }
    request.approve(command.adminId, this.clock.now());
    await this.requests.save(request);
  }
}
