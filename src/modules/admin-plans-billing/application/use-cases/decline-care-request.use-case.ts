import { Inject, Injectable } from '@nestjs/common';
import {
  ADDITIONAL_CARE_REQUEST_REPOSITORY,
  AdditionalCareRequestRepository,
} from '@modules/care-requests/domain/additional-care-request.repository';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';

interface DeclineCareRequestCommand {
  requestId: string;
  adminId: string;
  note: string | null;
}

/** Admin action: decline a pending additional care request with an optional note. */
@Injectable()
export class DeclineCareRequestUseCase {
  constructor(
    @Inject(ADDITIONAL_CARE_REQUEST_REPOSITORY)
    private readonly requests: AdditionalCareRequestRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: DeclineCareRequestCommand): Promise<void> {
    const request = await this.requests.findById(command.requestId);
    if (request === null) {
      throw new NotFoundDomainException('Care request not found');
    }
    request.decline(command.adminId, command.note, this.clock.now());
    await this.requests.save(request);
  }
}
