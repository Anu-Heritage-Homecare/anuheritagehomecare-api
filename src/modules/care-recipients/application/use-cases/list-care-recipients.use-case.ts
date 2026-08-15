import { Inject, Injectable } from '@nestjs/common';
import {
  CARE_RECIPIENT_REPOSITORY,
  CareRecipientRepository,
} from '../../domain/care-recipient.repository';
import { CareRecipientResult, toCareRecipientResult } from '../dto/care-recipient.result';

/** Use case: list every care recipient owned by the authenticated family owner. */
@Injectable()
export class ListCareRecipientsUseCase {
  constructor(
    @Inject(CARE_RECIPIENT_REPOSITORY)
    private readonly repository: CareRecipientRepository,
  ) {}

  async execute(params: { ownerId: string }): Promise<CareRecipientResult[]> {
    const recipients = await this.repository.listByOwner(params.ownerId);
    return recipients.map(toCareRecipientResult);
  }
}
