import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';
import { loadOwnedCareRecipient } from '../load-owned-care-recipient';

/** Use case: fetch a single care recipient owned by the authenticated family owner. */
@Injectable()
export class GetCareRecipientUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
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
    return toCareRecipientResult(recipient);
  }
}
