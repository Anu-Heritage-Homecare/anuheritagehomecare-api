import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/**
 * Use case: finalise a care recipient's onboarding. The aggregate enforces that
 * the required steps are complete before promoting the draft to active.
 */
@Injectable()
export class FinalizeCareRecipientUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(params: {
    ownerId: string;
    careRecipientId: string;
  }): Promise<CareRecipientResult> {
    const recipient = await loadOwnedCareRecipient(
      this.repository,
      params.careRecipientId,
      params.ownerId,
    );
    recipient.finalize(this.clock.now());
    await this.repository.save(recipient);
    recipient.clearDomainEvents();

    return toCareRecipientResult(recipient);
  }
}
