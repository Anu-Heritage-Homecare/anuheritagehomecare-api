import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { NotFoundDomainException } from '@shared/domain/domain-exception';
import { AdditionalCareRequest } from '../../domain/additional-care-request.entity';
import {
  ADDITIONAL_CARE_REQUEST_REPOSITORY,
  AdditionalCareRequestRepository,
} from '../../domain/additional-care-request.repository';
import { CareRequestResult, toCareRequestResult } from '../dto/care-request.result';
import {
  CARE_RECIPIENT_OWNER_DIRECTORY,
  CareRecipientOwnerDirectory,
} from '../ports/care-recipient-owner-directory.port';

export interface SubmitAdditionalCareRequestCommand {
  ownerId: string;
  careRecipientId: string;
  careType: string;
  requestedDate: Date;
  startMinute: number;
  durationMinutes: number;
  reason?: string | null;
}

/**
 * Use case: a family owner requests an extra care session for one of their
 * recipients. The recipient must belong to the requesting owner (otherwise it is
 * reported as not found, never disclosing another family's recipient). The
 * request is stored PENDING for the office to action.
 */
@Injectable()
export class SubmitAdditionalCareRequestUseCase {
  constructor(
    @Inject(ADDITIONAL_CARE_REQUEST_REPOSITORY)
    private readonly requests: AdditionalCareRequestRepository,
    @Inject(CARE_RECIPIENT_OWNER_DIRECTORY)
    private readonly recipients: CareRecipientOwnerDirectory,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: SubmitAdditionalCareRequestCommand): Promise<CareRequestResult> {
    const ownerId = await this.recipients.ownerOf(command.careRecipientId);
    if (ownerId === null || ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care recipient not found');
    }

    const request = AdditionalCareRequest.submit({
      id: this.ids.generate(),
      ownerId: command.ownerId,
      careRecipientId: command.careRecipientId,
      careType: command.careType,
      requestedDate: command.requestedDate,
      startMinute: command.startMinute,
      durationMinutes: command.durationMinutes,
      reason: command.reason,
      now: this.clock.now(),
    });
    await this.requests.save(request);

    return toCareRequestResult(request);
  }
}
